import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** 출처 — 모든 사실 주장은 여기에 연결된다 (06 §1) */
const source = z.object({
  title: z.string(),
  /**
   * 검색 결과 전용 제목 (선택).
   *
   * 2026-08-16. 제목이 62자를 넘으면 모바일 검색 결과에서 잘린다.
   * 그렇다고 제목을 「Geoje Island Guide」 처럼 밋밋하게 깎으면
   * **클릭할 이유가 사라진다** — 그건 정확히 AI 블로그가 하는 짓이다.
   *
   * 그래서 둘을 분리한다.
   *   title    — 페이지에 실제로 걸리는 제목. 길어도 좋다. 여기가 필력이다.
   *   seoTitle — 검색 결과에만 쓰는 짧은 제목. 검색어가 앞에 온다.
   * seoTitle 이 없으면 title 을 쓴다.
   */
  /*
   * 60 으로 내렸다 (2026-08-17). 62 는 내가 고른 느슨한 기준이었다 — BaseLayout 주석 참조.
   * 49(= 60 − " — HANKUKIN") 로 더 조이지 않는 이유: 60 을 넘으면 BaseLayout 이
   * 브랜드를 떼므로 55자짜리 제목도 결과적으로 55자로 나온다. 막을 이유가 없다.
   */
  seoTitle: z.string().max(60).optional(),
  url: z.string().url(),
  type: z.enum([
    'official_production', 'official_interview', 'official_social',
    'public_institution', 'reliable_media', 'aggregate_data',
    'merchant_official', 'editorial',
  ]),
  checkedAt: z.coerce.date(),
});

/**
 * 이미지 — license/source/credit 중 하나라도 비면 빌드가 실패한다 (결정서 §5.3).
 *
 * 2026-08-13 보강 두 가지:
 *
 * ① src 를 문자열이 아니라 Astro 의 image() 로 받는다.
 *    문자열이면 파일이 없어도 빌드가 통과한다. 즉 깨진 이미지를 발행할 수 있었다.
 *    image() 는 파일이 실제로 있어야 통과하고, 크기·포맷 최적화도 함께 해준다.
 *
 * ② license 를 자유 문자열이 아니라 코드로 받는다.
 *    "공공누리 1유형쯤 되겠지" 같은 판단이 들어갈 자리를 없앤다.
 *    한국관광공사 자료는 사진마다 유형이 다르다 — 포토코리아 페이지에도
 *    kogl_variant_01~04 가 모두 존재한다. 4유형은 상업적 이용이 불가하므로
 *    애초에 열거형에서 뺀다. 넣을 수 없으면 실수할 수도 없다.
 */
const LICENSE = {
  'kogl-1': { label: '공공누리 제1유형 (출처표시)', canModify: true },
  'kogl-3': { label: '공공누리 제3유형 (출처표시-변경금지)', canModify: false },
  'cc0': { label: 'CC0 / Public Domain', canModify: true },
  'cc-by': { label: 'CC BY', canModify: true },
  'cc-by-sa': { label: 'CC BY-SA', canModify: true },
  'own': { label: '자체 촬영·제작', canModify: true },
};
export const LICENSE_LABEL = Object.fromEntries(
  Object.entries(LICENSE).map(([k, v]) => [k, v.label]),
);
export const LICENSE_CAN_MODIFY = Object.fromEntries(
  Object.entries(LICENSE).map(([k, v]) => [k, v.canModify]),
);

const imageSchema = (image) => z.object({
  src: image(),
  alt: z.string().min(5),
  license: z.enum(Object.keys(LICENSE)),
  sourceUrl: z.string().url().or(z.literal('self')),
  credit: z.string().min(1),
  isIllustration: z.boolean().default(false),
});

const affiliateLink = z.object({
  label: z.string(),
  url: z.string().url(),
  merchant: z.string(),
  category: z.enum(['stay', 'tour', 'ticket', 'transport', 'food', 'beauty', 'goods', 'learning', 'experience']),
  relationship: z.enum(['confirmed_use', 'inspired_by', 'suggested']).default('suggested'),
  priceCheckedAt: z.coerce.date().optional(),
});

/** image() 는 스키마 컨텍스트에서만 얻을 수 있어 팩토리로 만든다 */
const baseFields = (image) => ({
  title: z.string(),
  /**
   * 검색 결과 전용 제목 (선택).
   *
   * 2026-08-16. 제목이 62자를 넘으면 모바일 검색 결과에서 잘린다.
   * 그렇다고 제목을 「Geoje Island Guide」 처럼 밋밋하게 깎으면
   * **클릭할 이유가 사라진다** — 그건 정확히 AI 블로그가 하는 짓이다.
   *
   * 그래서 둘을 분리한다.
   *   title    — 페이지에 실제로 걸리는 제목. 길어도 좋다. 여기가 필력이다.
   *   seoTitle — 검색 결과에만 쓰는 짧은 제목. 검색어가 앞에 온다.
   * seoTitle 이 없으면 title 을 쓴다.
   */
  /*
   * 60 으로 내렸다 (2026-08-17). 62 는 내가 고른 느슨한 기준이었다 — BaseLayout 주석 참조.
   * 49(= 60 − " — HANKUKIN") 로 더 조이지 않는 이유: 60 을 넘으면 BaseLayout 이
   * 브랜드를 떼므로 55자짜리 제목도 결과적으로 55자로 나온다. 막을 이유가 없다.
   */
  seoTitle: z.string().max(60).optional(),
  summary: z.string().min(20).max(400),
  lang: z.string().default('en'),
  publishedAt: z.coerce.date(),
  checkedAt: z.coerce.date(),
  riskGrade: z.enum(['green', 'yellow']),      // red 는 발행되지 않으므로 스키마에 존재하지 않는다
  contentScore: z.number().min(65).max(100),   // 65점 미만은 빌드 자체가 실패한다 (04 §4)
  hero: imageSchema(image).optional(),
  sources: z.array(source).min(1),
  draft: z.boolean().default(false),

  /**
   * 상업 링크는 **모든 축의 공통 필드다.** (2026-08-16 밤에 옮겼다)
   *
   * 전에는 scenes·guides·now 세 곳에만 선언돼 있었다.
   * 그래서 eSIM 편(decode)이 frontmatter 에 Klook 제휴 링크를 적었을 때
   * Zod 가 **모르는 키라고 조용히 버렸다.** 오류도 경고도 없었다.
   * 스키마를 통과했고, 빌드가 성공했고, 링크만 없었다.
   *
   * 어느 축이 상업 링크를 가질 수 있는지는 **글이 정할 일이지 스키마가 정할 일이 아니다.**
   * 한글 편에 한국어 교재를, decode 편에 eSIM 을 붙일 이유는 얼마든지 있다.
   * 여기 두면 새 축을 만들어도 저절로 따라온다.
   */
  visitKorea: z.array(affiliateLink).default([]),
  bringKoreaHome: z.array(affiliateLink).default([]),
});

const scenes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/scenes' }),
  schema: ({ image }) => z.object({
    ...baseFields(image),
    work: z.string(),
    workType: z.enum(['drama', 'film', 'mv', 'variety', 'kpop', 'performance', 'animation']),
    /**
     * Scenes 의 두 종류 (2026-08-15 운영자 결정).
     *
     *   location — 촬영지·현장. 주소·사진 팁·교통이 **반드시** 있어야 한다.
     *              이 강제가 이 컬렉션의 존재 이유다. 풀면 안 된다.
     *   culture  — 작품·현상·인물 자체. 갈 곳이 없는 글이다.
     *              K팝 차트, 애니메이션, 공연 문화가 여기 들어온다.
     *
     * 왜 나눴나. Scenes 를 K-드라마·K팝·K무비·K공연 전체의 입구로 삼기로 했는데,
     * 기존 스키마는 '한 장소' 를 전제하고 있어서 차트 이야기가 들어갈 자리가 없었다.
     * 그렇다고 주소 강제를 없애면 촬영지 기사가 부실해진다. 그래서 종류를 나누고,
     * location 일 때만 강제한다 (아래 superRefine).
     */
    sceneKind: z.enum(['location', 'culture']).default('location'),
    stars: z.array(z.string()).default([]),
    claimWording: z.enum([
      'official_filming_location', 'confirmed_in_interview', 'official_social_appearance',
      'reported_by_media', 'inspired_by', 'suggested_nearby',
    ]).optional(),
    place: z.object({
      name: z.string(),
      nameKo: z.string().optional(),
      address: z.string(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      mapUrl: z.string().url().optional(),
      businessStatus: z.enum(['operating', 'temporarily_closed', 'permanently_closed', 'unknown']).default('unknown'),
      publicAccess: z.boolean().default(true),
      officialUrl: z.string().url().optional(),
      safetyNotes: z.string().optional(),
    }).optional(),
    photoTips: z.object({
      whereToStand: z.string(),
      direction: z.string(),
      orientation: z.enum(['vertical', 'horizontal', 'both']).default('both'),
      zoom: z.string().optional(),
      bestTime: z.string(),
      crowdTip: z.string().optional(),
      props: z.array(z.string()).default([]),
    }).optional(),
    visit: z.object({
      bestSeason: z.string(),
      gettingThere: z.string(),
      transportCost: z.string().optional(),
      admission: z.string().optional(),
      whatToBring: z.array(z.string()).default([]),
    }).optional(),
    itinerary: z.array(z.object({
      slot: z.enum(['morning', 'lunch', 'afternoon', 'evening', 'night']),
      title: z.string(),
      // (일정 한 칸에는 seoTitle 이 없다. 예전 일괄치환이 여기까지 밀고 들어와 있었다 — 2026-08-16 제거)
      detail: z.string(),
    })).default([]),
    nearbyCulture: z.string().optional(),
  }).superRefine((d, ctx) => {
    if (d.sceneKind !== 'location') return;
    for (const f of ['place', 'photoTips', 'visit', 'claimWording']) {
      if (!d[f]) ctx.addIssue({
        code: z.ZodIssueCode.custom, path: [f],
        message: `촬영지 기사(sceneKind: location)에는 ${f} 가 반드시 있어야 합니다. `
               + `갈 곳이 없는 글이면 sceneKind 를 culture 로 두십시오.`,
      });
    }
  }),
});

/**
 * Hangul — 간판과 글자를 읽는 법.
 *
 * Decode 와 왜 나눴나 (2026-08-15 운영자 결정).
 *   Decode = "저 사람이 왜 오빠라고 불렀지?"  — 보고 나서 생기는 호기심
 *   Hangul = "이 간판이 무슨 가게지?"         — 지금 길에 서서 급한 문제
 *   독자의 의도가 다르면 상자도 달라야 한다. 한 곳에 넣으면 둘 다 흐려진다.
 */
const hangul = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/hangul' }),
  schema: ({ image }) => z.object({
    ...baseFields(image),
    // 이 글에서 다루는 글자·낱말. 검색과 색인에 쓴다.
    letters: z.array(z.object({
      ko: z.string(),
      romanized: z.string().optional(),
      note: z.string().optional(),
    })).default([]),
    seriesPart: z.number().int().min(1).optional(),
    region: z.string().optional(),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/guides' }),
  schema: ({ image }) => z.object({
    ...baseFields(image), region: z.string().optional(), era: z.string().optional(),
    /**
     * 실행 링크 (2026-08-16 에 now·guides 로 확대).
     *
     * 원래 scenes 에만 있었다. 그런데 **구매·예약 의도가 가장 높은 글은 now 축**이다 —
     * 기차표, 공항 이동, 궁 입장권. 정작 그 글들에는 나갈 문이 없었다.
     *
     * 다만 모든 글에 넣지 않는다. 배열이 비면 블록이 통째로 렌더링되지 않는다.
     * 한글 읽는 법이나 호칭 설명에 예약 버튼을 붙이면
     * 그때부터 이 사이트는 다시 자동 생산물처럼 읽힌다.
     */
  }),
});

/**
 * Decode — 자막이 놓치는 것.
 *
 * 원래 Phase 2 로 묶여 있었으나, 정의를 다시 보니 신호 데이터가 필요 없다.
 * 호칭·존댓말·말투는 지금 1차 출처(국립국어원 등)로 쓸 수 있다 (2026-08-14).
 */
const decode = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/decode' }),
  schema: ({ image }) => z.object({
    ...baseFields(image),
    // 다루는 표현들. 검색·색인에 쓴다.
    expressions: z.array(z.object({
      ko: z.string(),
      romanized: z.string().optional(),
      literal: z.string().optional(),
      register: z.enum(['casual', 'polite', 'formal', 'slang', 'varies']).default('varies'),
    })).default([]),
    region: z.string().optional(),
    era: z.string().optional(),
  }),
});

/**
 * Korea Now — "지금 한국이 실제로 이렇다".
 *
 * 원래 정의는 '주간 트렌드 리포트' 였다. 네이버 API 가 막혀 신호가 부족해서 Phase 2 로 미뤄져 있었다.
 * 2026-08-14 재정의: 요금·교통·예약·에티켓. 출처가 확실하고 예약 전환에 가장 가깝다.
 *
 * 요금 정보는 바뀐다. faresCheckedAt 을 따로 두어 재확인 주기를 관리한다.
 */
const now = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/now' }),
  schema: ({ image }) => z.object({
    ...baseFields(image),
    region: z.string().optional(),
    /**
     * 실행 링크 (2026-08-16 에 now·guides 로 확대).
     *
     * 원래 scenes 에만 있었다. 그런데 **구매·예약 의도가 가장 높은 글은 now 축**이다 —
     * 기차표, 공항 이동, 궁 입장권. 정작 그 글들에는 나갈 문이 없었다.
     *
     * 다만 모든 글에 넣지 않는다. 배열이 비면 블록이 통째로 렌더링되지 않는다.
     * 한글 읽는 법이나 호칭 설명에 예약 버튼을 붙이면
     * 그때부터 이 사이트는 다시 자동 생산물처럼 읽힌다.
     */
    // 요금·운임을 담은 글은 이 날짜를 본문에도 적고 3개월마다 재확인한다
    faresCheckedAt: z.coerce.date().optional(),
  }),
});

export const collections = {
  hangul, scenes, guides, decode, now };
