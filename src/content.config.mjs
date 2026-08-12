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

/** 이미지 — license/source/credit 중 하나라도 비면 스키마 검증에서 빌드가 실패한다 (결정서 §5.3) */
const image = z.object({
  src: z.string(),
  alt: z.string(),
  license: z.string().min(1),
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

const baseFields = {
  title: z.string(),
  summary: z.string().min(20).max(400),
  lang: z.string().default('en'),
  publishedAt: z.coerce.date(),
  checkedAt: z.coerce.date(),
  riskGrade: z.enum(['green', 'yellow']),      // red 는 발행되지 않으므로 스키마에 존재하지 않는다
  contentScore: z.number().min(65).max(100),   // 65점 미만은 빌드 자체가 실패한다 (04 §4)
  hero: image.optional(),
  sources: z.array(source).min(1),
  draft: z.boolean().default(false),
};

const scenes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/scenes' }),
  schema: z.object({
    ...baseFields,
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
  schema: z.object({ ...baseFields, region: z.string().optional(), era: z.string().optional() }),
});

export const collections = { scenes, guides };
