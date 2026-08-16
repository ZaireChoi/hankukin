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
  // 2026-08-16 운영자 지적으로 교체 — 'products you can buy worldwide' 는
  // 해당 기사가 0편인 약속이었다. 실전형 대문과 같은 방향으로 맞춘다.
  defaultMetaDescription:
    'K-drama brought you to Korea. We cover the ground game — reading signs, fares, tickets, food, clinics — checked against Korean primary sources.',

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

/**
 * 언어.
 *
 * LOCALES 는 **실제로 발행 중인 언어**다. 여기 넣는 순간 라우팅·사이트맵·hreflang 이
 * 전부 그 언어를 사실로 취급한다. 그러므로 **글이 먼저 있고 나서** 넣는다.
 * 반대로 하면 빈 페이지가 색인된다 — 그건 없는 것보다 나쁘다.
 *
 * 2026-08-17. URL 세그먼트를 zh-cn/zh-tw → zh-hans/zh-hant 로 바꿨다.
 *   중국어 번체는 대만만 쓰는 게 아니다 (홍콩·마카오·화교권).
 *   국가 코드로 나누면 그 독자들에게 「너희 것이 아니다」라고 말하는 셈이고,
 *   hreflang 값도 어차피 zh-Hans / zh-Hant (문자 기준)라 URL 과 신호가 어긋났다.
 *   아직 발행 전이라 지금 바꾸는 비용이 0 이다. 발행 후엔 리디렉션 부채가 된다.
 */
export const LOCALES = ['en', 'ja'];              // 발행 중인 언어. 글이 생기면 그때 추가한다
export const PLANNED_LOCALES = ['en', 'ja', 'zh-hans', 'zh-hant'];
export const DEFAULT_LOCALE = 'en';

export const LOCALE_LABELS = {
  en: 'English',
  ja: '日本語',
  'zh-hans': '简体中文',
  'zh-hant': '繁體中文',
};

/** hreflang 속성값 매핑 (URL 세그먼트 → BCP-47) */
export const HREFLANG = {
  en: 'en',
  ja: 'ja',
  'zh-hans': 'zh-Hans',
  'zh-hant': 'zh-Hant',
};

/**
 * 언어별로 **무엇을 쓸 것인가.**
 *
 * 2026-08-17 운영자 결정: "언어마다 다른 목록."
 *
 * 왜 같은 목록을 4개 언어로 밀면 안 되는가 —
 *   2026년에 위챗페이가 한국 국가 QR 체계와 직접 연동됐고,
 *   Alipay+ 는 한국에서 17개 결제 파트너를 지원한다.
 *   **그러면 3D Secure 편과 ATM 편은 중국 독자의 문제가 아니다.**
 *   일본 독자는 한자를 읽는다 — 「의원·병원」 간판 해독의 값이 절반으로 준다.
 *
 *   번역은 문장을 옮기는 일이지만, 다국어는 **독자를 바꾸는 일**이다.
 *   독자가 바뀌면 무엇이 막히는지가 바뀐다. 목록도 바뀌어야 한다.
 *
 * 이 표는 **계획이지 약속이 아니다.** 실제 발행은 LOCALES 가 정한다.
 */
export const LOCALE_CONTENT_PLAN = {
  ja: {
    why: '항공편이 조밀하고 체류가 짧다(2~3박). 한자를 읽어 간판의 절반이 이미 열려 있다.',
    priority: [
      'decode/korea-esim-no-phone-number',      // 본인확인은 국적과 무관하다
      'now/incheon-airport-to-seoul-train-bus-taxi',
      'now/seoul-transport-fares-subway-bus-taxi',
      'guides/seoul-palaces-free-admission-who-qualifies',
      'guides/hanbok-free-palace-entry-what-counts',
      'now/korea-food-prices-what-meals-cost',
    ],
    deprioritise: {
      'hangul/learn-to-read-korean-signs-alphabet':
        '한자를 읽는 독자에게는 「읽을 수 없다」는 전제 자체가 다르다. ' +
        '한글 편은 번역이 아니라 **일본어 독자용으로 다시 써야 한다** — ' +
        '한자로는 안 읽히는 순우리말 간판이 무엇인지가 그쪽의 실제 문제다.',
    },
  },
  'zh-hans': {
    why: '방문객 수가 가장 많다. 결제 환경이 영어권과 근본적으로 다르다.',
    priority: [
      'decode/korea-esim-no-phone-number',
      'now/incheon-airport-to-seoul-train-bus-taxi',
      'now/seoul-transport-fares-subway-bus-taxi',
      'guides/seoul-palaces-free-admission-who-qualifies',
      'now/korea-food-prices-what-meals-cost',
      'guides/bukchon-hanok-village-visiting-hours-fine',
    ],
    deprioritise: {
      'now/korea-3d-secure-card-declined-online':
        '위챗페이·알리페이·유니온페이를 쓰는 독자에게 3D Secure 는 주된 벽이 아니다. ' +
        '**그 자리에 들어갈 글을 새로 써야 한다** — 한국에서 위챗/알리페이가 어디까지 되는가.',
      'now/korea-atm-foreign-card-cash':
        '같은 이유. 유니온페이 ATM 수용 범위는 비자·마스터와 다르고, ' +
        '확인 없이 번역하면 그 독자에게 틀린 우선순위를 준다.',
    },
  },
  'zh-hant': {
    why: '대만·홍콩·마카오·화교권. 간체와 어휘와 결제 환경이 모두 다르다.',
    priority: [],   // 간체 발행 뒤 실제 유입을 보고 정한다. 지금 정하면 추측이다
    deprioritise: {},
  },
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
