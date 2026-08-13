# HANKUKIN — Phase 1 MVP

`Get Into Korea.` 글로벌 K-컬처 팬을 한국 여행 예약과 해외 한국제품 구매로 연결하는 영어 우선 콘텐츠·커머스 사이트.

- 주 도메인: **hankuk-in.com** (Porkbun, 2028-08-12 만료)
- 스택: **Astro 5 + Cloudflare Pages + Supabase + GitHub Actions**
- 월 고정비: **0원** (도메인·Claude API 제외)

## 실행

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 생성
npm run preview
```

## 구조

```
src/
├─ config/brand.mjs        ← 브랜드·도메인 단일 출처. 도메인 변경 시 여기만 수정
├─ lib/claims.mjs          ← 허용표현 사전 + Green/Yellow/Red 위험등급 판정
├─ content.config.mjs      ← 콘텐츠 스키마 = 발행 가드레일
├─ content/scenes/         ← Scene 기사 (MDX)
├─ layouts/BaseLayout.astro
├─ components/
└─ pages/[lang]/           ← i18n 라우팅. 현재 en 만 활성
db/schema.sql              ← Supabase Phase 1 스키마
```

## 발행 가드레일 (빌드 타임 강제)

스키마 위반은 경고가 아니라 **빌드 실패**다. 잘못된 콘텐츠가 배포되는 경로 자체를 없앤다.

| 규칙 | 근거 | 위반 시 |
|---|---|---|
| `contentScore` 65점 미만 | 04 §4 | 빌드 실패 |
| `sources` 0건 | 06 §1 | 빌드 실패 |
| 이미지 `license`/`credit` 누락 | 결정서 §5.3 | 빌드 실패 |
| `riskGrade: red` | 05 §3 | 스키마에 존재하지 않음 |
| 제휴 링크 `rel="sponsored nofollow"` | 검색엔진 정책 | 컴포넌트가 자동 삽입 |
| 영구폐업 장소의 예약 CTA | 05 §4 | 렌더링 단계에서 자동 제거 |

`src/lib/claims.mjs`의 `gradeClaim()`은 출처와 신뢰도에서 표현을 **자동 선택**한다.
언론 출처 1곳이면 `Inspired by`로 강등되고, 2곳이면 `Reported by reliable media`로 올라간다.
표현을 사람이 고르지 않는 것이 핵심이다.

## 배포 (Cloudflare Pages)

| 항목 | 값 |
|---|---|
| Build command | `npm run build` |
| Build output | `dist` |
| Node version | 20 이상 |

빌드 월 500회 무료. 하루 1회 배치 배포 시 월 30회 소진.

## 환경변수

`.env.example` 참고. **실제 값은 GitHub Secrets / Cloudflare 환경변수에만 넣는다.**
`brand.mjs`의 `analytics` 값이 비어 있으면 해당 스크립트를 아예 렌더링하지 않는다 — 더미 ID를 넣지 않는다.

## 발행 전 확인할 것

- [ ] `brand.mjs` → `legalName` (사업자등록 후)
- [ ] `brand.mjs` → `analytics.ga4MeasurementId`, `adsenseClientId`
- [ ] MX 레코드 설정 후 `hello@hankuk-in.com` 수신 확인
- [ ] 제휴 프로그램 승인 후 각 링크에 트래킹 파라미터 부착
      (현재 샘플 기사의 링크는 **트래킹 없는 일반 링크**다. 수익이 발생하지 않는다)
- [ ] 샘플 기사 `goblin-jumunjin-breakwater`의 출처 2건을 직접 열어 재확인

## Korea Now 신호 수집기 (구현 완료 · 발행은 아직)

```bash
node scripts/__tests__/normalize.test.mjs    # 정규화 로직 단위 테스트
node scripts/__tests__/collect.dryrun.mjs    # API 키 없이 파이프라인 검증
node scripts/collect-trends.mjs              # 실제 수집 (네이버 키 필요)
```

**이 수집기는 발행하지 않는다. 신호만 쌓는다.** 트렌드 판정에는 완료된 4주치가 필요하고
데이터는 소급 생성이 불가능하므로, 사이트가 완성되기 전부터 돌려야 한다.

### 실제 API 응답을 관측해 방어한 함정 3가지

2026-08-13 실측 기준이며, `scripts/__tests__/normalize.test.mjs` 가 실제 응답으로 회귀 검증한다.

| 함정 | 관측 사실 | 방어 |
|---|---|---|
| **ratio 는 요청 내 상대값** | 한 요청의 최댓값이 항상 100 | 모든 요청에 고정 앵커 키워드를 넣고 앵커 대비 비율만 비교 |
| **마지막 구간은 진행 중** | 약과 76.9 → 26.0 (같은 추세인데 -66%) | 완료되지 않은 구간은 버림. 안 버리면 전부 Cooling 오판 |
| **검색량 부족 = 빈 배열** | `두바이스크림` → `data: []` | `insufficient_volume` 로 구분. 하락으로 세지 않음 |

### 단일 신호 상한

독립 신호가 1개면 아무리 급등해도 `emerging` 을 넘지 못한다 (05 §8, 11 §4).
이 규칙은 세 겹으로 강제된다 — `evaluateStage()`, 단위 테스트, 그리고 DB 제약
`trend_topic.single_source_capped`. 같은 소스 2건은 독립 2건으로 세지 않는다.

## 신작 레이더 (구현 완료 · 발행은 아직)

```bash
node scripts/__tests__/netflix.test.mjs      # 파서 테스트
node scripts/__tests__/releases.dryrun.mjs   # 통합 드라이런
node scripts/collect-releases.mjs            # 실제 수집
```

Korea Now 수집기가 음식·뷰티·패션(콘텐츠의 30% 축)만 보는 반면, 이 레이더는
**드라마·K-pop 축(50% 축)** 의 시의성을 담당한다. 문서 07 §6-1 의
"신작·컴백 직후 신속 발행" 원칙과 04 §4 의 '현재 검색 수요 25점'을 채우는 입력이다.

### 순위가 아니라 '쓸 수 있는가'로 판단한다

Netflix 순위를 그대로 따르지 않는다. 세 요소를 합산한다.

| 요소 | 비중 | 이유 |
|---|---|---|
| 신작성 (신규 진입 / 순위 상승) | 50% | 1위지만 8주째인 작품보다, 6위인데 이번 주 진입한 작품이 선점 기회다 |
| 촬영지 적합도 | 35% | 우리가 파는 것은 '가볼 수 있는 장소'다. 스튜디오 예능은 순위가 높아도 쓸 게 없다 |
| 한국·글로벌 동시 진입 | 15% | 한국에서 실제로 뜨고 + 우리 독자도 본다 = 가장 강한 기회 |

실제 2026-08-13 데이터로 검증했을 때, Netflix 한국 1위였던 예능 `I am Solo`(31주차)는
최하위로 내려가고 6위 사극 `The East Palace`가 1순위 후보가 됐다. 사극은 고궁이 곧
촬영지라 Scenes 축과 문화·역사 축에 동시에 걸린다.

### ⚠ 아직 검증되지 않은 부분

Netflix 어댑터는 **실제 응답으로 검증하지 못했다** (개발 환경에서 netflix.com 접근 차단).
TSV 규격과 2026-08-13 실제 페이지 텍스트로 단위 테스트는 통과했으나,
**첫 CI 실행 결과를 반드시 눈으로 확인할 것.** 실패해도 파이프라인은 멈추지 않고
Naver 신호만으로 계속 진행하도록 설계했다.

## Phase 2 남은 것

- Slang Decoder 엔트리 30개
- 자동 발행 파이프라인 (초안 → 위험등급 → 발행)
- 주간 운영자 대시보드

`now` / `decode` / `guides` 페이지는 현재 `noindex` 이며 사이트맵에서도 제외된다.
발행 시작하면 `brand.mjs`의 `NOINDEX_PATHS` 에서 빼는 것만으로 색인이 열린다.
