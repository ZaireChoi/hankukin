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

## Phase 2 예정

- Korea Now 신호 수집기 (Naver DataLab 검색·쇼핑)
- Slang Decoder 엔트리
- GitHub Actions 자동 발행 파이프라인
- 주간 운영자 대시보드

`now` / `decode` / `guides` 페이지는 현재 `noindex` 이며 사이트맵에서도 제외된다.
발행 시작하면 `brand.mjs`의 `NOINDEX_PATHS` 에서 빼는 것만으로 색인이 열린다.
