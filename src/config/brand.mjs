/**
 * HANKUKIN — 브랜드 설정 단일 출처
 * 기획문서 12 §6: 브랜드명·도메인을 코드 전역에 하드코딩하지 않는다.
 * 사이트명·메타데이터·푸터·구조화데이터·사이트맵·OG 이미지가 모두 이 파일을 참조한다.
 * 도메인이 바뀌면 이 파일 한 곳만 수정하면 된다.
 */
export const BRAND = {
  name: 'HANKUKIN',
  slug: 'hankukin',
  tagline: 'Get Into Korea.',
  taglineSecondary: 'Your Way Into Real Korea.',

  primaryDomain: 'hankuk-in.com',
  canonicalHost: 'www.hankuk-in.com',

  legalName: '',                       // 사업자등록 후 기입
  supportEmail: 'hello@hankuk-in.com',

  defaultMetaTitle: 'HANKUKIN — Get Into Korea.',
  defaultMetaDescription:
    'Discover K-pop and K-drama locations, Korean trends, slang, travel routes and products you can experience in Korea or buy worldwide.',

  socialHandles: {
    youtube: '@hankukin',
    instagram: '@hankukin',
    tiktok: '@hankukin',
    pinterest: '@hankukin',
    x: '@hankukin',
  },

  logoUrl: '/logo.svg',
  ogImage: '/og-default.png',

  // 미설정 시 해당 스크립트를 렌더링하지 않는다 (더미 ID를 넣지 않는다)
  analytics: {
    ga4MeasurementId: '',
    adsenseClientId: '',
  },
};

export const LOCALES = ['en'];              // Phase 1은 영어 단일 (결정서 O2)
export const PLANNED_LOCALES = ['en', 'ja', 'zh-cn', 'zh-tw'];
export const DEFAULT_LOCALE = 'en';

export const LOCALE_LABELS = {
  en: 'English',
  ja: '日本語',
  'zh-cn': '简体中文',
  'zh-tw': '繁體中文',
};

/** hreflang 속성값 매핑 (URL 세그먼트 → BCP-47) */
export const HREFLANG = {
  en: 'en',
  ja: 'ja',
  'zh-cn': 'zh-Hans',
  'zh-tw': 'zh-Hant',
};

/**
 * 아직 발행하지 않은 섹션. noindex 처리되고 사이트맵에서도 제외된다.
 * Phase 2 에서 실제 콘텐츠가 생기면 여기서 제거하는 것만으로 색인이 열린다.
 */
export const NOINDEX_PATHS = [];   // now 는 2026-08-14 발행 시작 (요금·교통·예약)

/**
 * 섹션 정의는 여기 한 곳에만 둔다.
 *
 * 2026-08-14 운영자 지적: Now 와 Decode 목록 페이지가 둘 다
 * "Why It Matters / Culture & History" 를 달고 있었다.
 * guides/index.astro 를 복사해 링크 경로만 바꾸고 제목·설명·path·JSON-LD 를
 * 그대로 둔 것이 원인이다. 눈으로 보기 전에는 아무도 몰랐다.
 *
 * 그래서 목록 페이지가 제목을 직접 적지 않고 여기서 가져가게 했다.
 * 한 곳에만 있으면 어긋날 자리가 없다.
 */
export const CATEGORIES = [
  { key: 'scenes',  path: 'scenes',  label: 'HANKUKIN Scenes',   blurb: 'Where to Go',
    lead: 'K-drama, film, K-pop and performance — the places you can stand in, and the things themselves.' },
  { key: 'now',     path: 'now',     label: 'HANKUKIN Now',      blurb: "What's Hot",
    lead: 'What Korea costs and how it works right now — fares, prices and rules, each checked against the operator on a stated date.' },
  { key: 'decode',  path: 'decode',  label: 'HANKUKIN Decode',   blurb: 'What It Means',
    lead: 'The words subtitles drop — what Korean speakers are actually saying to each other, and why it matters in the scene.' },
  { key: 'hangul',  path: 'hangul',  label: 'HANKUKIN Hangul',   blurb: 'Read the Signs',
    lead: 'How to read Korean writing well enough to use it — the letters, the signs on the street, and what each kind of shop calls itself.' },
  { key: 'guides',  path: 'guides',  label: 'Culture & History', blurb: 'Why It Matters',
    lead: 'The background behind the places you visit and the stories you watch — with sources you can check.' },
];

/** 경로로 섹션을 찾는다. 없으면 던진다 — 조용히 엉뚱한 제목이 붙는 것보다 낫다. */
export function categoryByPath(path) {
  const c = CATEGORIES.find((x) => x.path === path);
  if (!c) throw new Error(`알 수 없는 섹션 경로: ${path}`);
  return c;
}
