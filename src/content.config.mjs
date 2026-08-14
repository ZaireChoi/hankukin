import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** 출처 — 모든 사실 주장은 여기에 연결된다 (06 §1) */
const source = z.object({
  title: z.string(),
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
  summary: z.string().min(20).max(400),
  lang: z.string().default('en'),
  publishedAt: z.coerce.date(),
  checkedAt: z.coerce.date(),
  riskGrade: z.enum(['green', 'yellow']),      // red 는 발행되지 않으므로 스키마에 존재하지 않는다
  contentScore: z.number().min(65).max(100),   // 65점 미만은 빌드 자체가 실패한다 (04 §4)
  hero: imageSchema(image).optional(),
  sources: z.array(source).min(1),
  draft: z.boolean().default(false),
});

const scenes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/scenes' }),
  schema: ({ image }) => z.object({
    ...baseFields(image),
    work: z.string(),
    workType: z.enum(['drama', 'film', 'mv', 'variety']),
    stars: z.array(z.string()).default([]),
    claimWording: z.enum([
      'official_filming_location', 'confirmed_in_interview', 'official_social_appearance',
      'reported_by_media', 'inspired_by', 'suggested_nearby',
    ]),
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
    }),
    photoTips: z.object({
      whereToStand: z.string(),
      direction: z.string(),
      orientation: z.enum(['vertical', 'horizontal', 'both']).default('both'),
      zoom: z.string().optional(),
      bestTime: z.string(),
      crowdTip: z.string().optional(),
      props: z.array(z.string()).default([]),
    }),
    visit: z.object({
      bestSeason: z.string(),
      gettingThere: z.string(),
      transportCost: z.string().optional(),
      admission: z.string().optional(),
      whatToBring: z.array(z.string()).default([]),
    }),
    itinerary: z.array(z.object({
      slot: z.enum(['morning', 'lunch', 'afternoon', 'evening', 'night']),
      title: z.string(),
      detail: z.string(),
    })).default([]),
    visitKorea: z.array(affiliateLink).default([]),
    bringKoreaHome: z.array(affiliateLink).default([]),
    nearbyCulture: z.string().optional(),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/guides' }),
  schema: ({ image }) => z.object({
    ...baseFields(image), region: z.string().optional(), era: z.string().optional(),
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

export const collections = { scenes, guides, decode };
