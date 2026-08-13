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
export const NOINDEX_PATHS = ['now', 'decode'];   // guides 는 2026-08-13 발행 시작

export const CATEGORIES = [
  { key: 'scenes',  path: 'scenes',  label: 'HANKUKIN Scenes', blurb: 'Where to Go' },
  { key: 'now',     path: 'now',     label: 'HANKUKIN Now',    blurb: "What's Hot" },
  { key: 'decode',  path: 'decode',  label: 'HANKUKIN Decode', blurb: 'What It Means' },
  { key: 'guides',  path: 'guides',  label: 'Culture & History', blurb: 'Why It Matters' },
];
