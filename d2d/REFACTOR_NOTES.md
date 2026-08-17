# Door to Door — 리팩터 인수인계 (2026-08-16)

GPT 인수인계 패키지를 받아 **P0(구조·안정성)** 과 **다국어 기반**을 처리한 결과입니다.
빌드와 렌더링 테스트를 모두 통과한 상태입니다.

---

## 1. 무엇이 바뀌었나

### i18n — `ko ? "가" : "b"` 를 전부 걷어냄

| | 이전 | 이후 |
|---|---|---|
| 언어 정의 | `type Lang = "ko" \| "en"` | `"en" \| "ko" \| "ja" \| "zh-Hans" \| "zh-Hant"` |
| UI 문자열 | JSX 안 삼항연산자 **333개** | `t("key")` · 사전 **345개 키** |
| 두 번째 i18n 체계 | `copy[lang]` 객체 (별도로 존재) | 사전으로 흡수, 단일 체계 |
| 언어 추가 비용 | JSX 333곳 수정 | **사전 파일 1개 추가** |

```
app/i18n/
  index.ts      Lang, LANGS, makeT, makeTf, loc, locField, hangul, roman
  keys.ts       TKey — 키 목록이 계약. 오타는 컴파일 에러
  en.ts         원본이자 폴백 (Record<TKey,string> — 누락 시 빌드 실패)
  ko.ts         100%
  ja.ts         100% (日本語)
  zh-Hant.ts    100% (繁體 · 台灣·홍콩)
  zh-Hans.ts    100% (简体 · 중국 대륙)
```

번역 진행률 확인:

```bash
node --experimental-strip-types scripts/i18n-status.mjs
```

### 데이터 필드는 JSX를 건드리지 않고 확장

`ko?plan.titleKo:plan.titleEn` 같은 30곳을 헬퍼로 교체했습니다.

```tsx
locField(lang, plan, "title")   // plan.titleJa ?? plan.titleEn
loc(lang, option)               // option.ja   ?? option.en
```

일본어를 넣으려면 **데이터에 `titleJa` 필드를 추가**하면 됩니다. JSX는 그대로입니다.

### 한글과 로마자는 번역 대상이 아님

```
경주역 · Gyeongju-yeok      ← 화면 언어가 무엇이든 항상 이대로
```

일본어로 읽는 사람도 택시 기사에게는 한국어를 보여줘야 하고, 카카오·네이버는
한글로만 정확히 검색됩니다. `app/i18n/index.ts`의 `hangul()` / `roman()`이
이 값들을 i18n에서 의도적으로 제외합니다.

### 새 기능 — Show to driver + 길찾기 넘기기

`app/components/ShowToDriver.tsx`

- **Show to driver** — 화면 가득 한글 지명. 기사에게 그대로 보여주면 됩니다.
- **Kakao / Naver / Google** — 각 구간을 지도앱으로 넘김. `app/lib/deeplinks.ts`
- 카카오·네이버 링크는 **한글로 검색어를 넘깁니다.** `Bulguksa Temple`은 잘 안
  나오지만 `불국사`는 정확합니다.

경로를 직접 계산하지 않는 것은 의도된 선택입니다. 도착시간을 약속하는 순간
정확도 책임이 생기고, 그건 유료 라우팅 API와 상시 감시를 뜻합니다. 넘기면
비용 0, API 키 0, 책임 0인데 실제 사용성은 오히려 낫습니다.

### PWA — 홈페이지에서 바로 설치

스토어 없이 홈화면에 설치되고, 통신이 끊겨도 열립니다.

```
public/manifest.webmanifest   standalone, 아이콘 192/512 + maskable
public/sw.js                  앱 셸만 캐시
app/components/InstallApp.tsx beforeinstallprompt → 자체 설치 버튼
```

서비스워커는 보수적으로 짰습니다.

- 지도 타일과 **모든 외부 도메인 캐시 안 함** (타일 정책·저장용량)
- 일정·주소·여권·예약 **개인정보 저장 안 함**
- 네비게이션은 network-first → 접속되면 항상 최신 빌드

### 기본 언어를 영어로

`useState<Lang>("ko")` → `"en"`, `<html lang="ko">` → `"en"`.
타깃이 방한 외국인인데 기본값이 한국어였습니다. 언어 전환에 따라
`document.documentElement.lang`도 갱신됩니다 (스크린리더·자동번역·검색엔진).

### 모듈 분리

`app/page.tsx` **622줄 → 339줄**

```
app/lib/types.ts               도메인 타입
app/lib/format.ts              formatWon, formatDurationFor (언어별 시간 표기)
app/lib/deeplinks.ts           지도앱 넘기기
app/data/journey.ts            transport, journeyOptions, samplePlans, origins …
app/data/route-coordinates.ts  좌표 + 한글 + 로마자
app/components/BuildRouteMap.tsx
app/components/ShowToDriver.tsx
app/components/InstallApp.tsx
```

---

## 2. 검증

```bash
npm ci
npm run build     # 통과
npm test          # 통과 (rendered-html)
```

렌더 결과 확인 완료 — `<html lang="en">`, manifest 링크, theme-color, 영어 UI 출력.

---

## 3. 상태 컨테이너와 뷰 분리 (P0 완료)

`app/state/TripContext.tsx` 하나가 화면 상태 전부를 들고 있고,
뷰는 전부 **모듈 최상위 컴포넌트**가 되었습니다.

```
app/state/TripContext.tsx   TripProvider · useTrip()
app/views/Chrome.tsx        Header · ModePalette
app/views/LiveView.tsx
app/views/PlanView.tsx      PlannerInput · PlannerResults · PlannerDetail 포함, 넷 다 최상위
app/views/BuildView.tsx
app/views/SavedView.tsx
app/page.tsx                163줄 — 활성 뷰 선택 + 모달 + 하단 내비만
```

**reducer가 아니라 context-of-useState를 쓴 이유**: 이 값들은 서로 얽히지 않은
독립적인 UI 스칼라(어느 탭인지, 어느 필터인지, 어떤 입력값인지)입니다.
reducer로 바꿔도 얻는 게 없고 호출부를 전부 다시 써야 합니다. 실제로 중요했던
건 **props 100개를 넘기지 않고 뷰를 Home() 밖으로 빼는 것**이었고, 그건 됐습니다.

### 포커스 버그를 막는 것은 구조 자체

원인은 "컴포넌트를 렌더 안에서 선언한 것"이었습니다. 렌더 중 선언된 컴포넌트는
부모가 갱신될 때마다 함수 정체성이 바뀌고, React는 이를 다른 타입으로 보아
서브트리를 통째로 언마운트→마운트합니다. 한글은 한 글자에 조합이 여러 번
일어나므로 이 문제가 가장 먼저 드러납니다.

`tests/structure.test.mjs`가 이 구조를 지킵니다.

- 다른 컴포넌트 안에서 선언된 컴포넌트가 하나라도 있으면 **실패**
- 네 화면이 최상위 default export가 아니면 **실패**
- `page.tsx`에 `useState`가 남아 있으면 **실패**

증상이 아니라 원인을 시험하므로, 누가 나중에 같은 실수를 해도 CI에서 걸립니다.

`tests/i18n.test.mjs`는 다국어 구조를 지킵니다.

- 뷰에 `ko?"…"` 형태의 언어 분기가 남아 있으면 **실패**
- `keys.ts`와 `en.ts`가 어긋나면 **실패**
- 한글·로마자가 사전으로 흘러들어가면 **실패**

```bash
npm test        # build + 8 tests
npm run i18n:status
```

---

## 4. 남은 일

### 데이터

- 좌표가 아직 프로토타입 값입니다. 지오코딩으로 재검증 필요
- 로마자 23곳은 국어의 로마자 표기법 기준으로 넣었으나 검수 권장
- 딥링크 URL 형식은 각 지도사 최신 문서로 확인 필요 (특히 네이버)

### 결정 대기

| 항목 | 권고 |
|---|---|
| 도로 길찾기 API | 연결하지 않고 딥링크 유지 |
| 지도 타일 | MVP는 OSM 공용, 트래픽 발생 후 상업 공급자 재검토 (OSM은 SLA 없음) |
| 출발 상세주소 | 외부로 좌표만, 정밀주소는 보내지 않음 |
| 제휴 | Trip.com·Agoda·Klook 신청 후 도메인 승인·쿠키·표시의무 확인 |

---

## 5. 언어를 하나 더 넣는 방법

```
1. app/i18n/th.ts 생성 — Partial<Record<TKey,string>>
2. app/i18n/index.ts 의 Lang, LANGS, DICT, SUFFIX, BARE 에 한 줄씩 추가
3. 끝
```

JSX는 건드리지 않습니다. 그게 이번 리팩터의 목적이었습니다.
