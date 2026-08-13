/**
 * 주장(Claim) 허용표현 사전 + 위험등급 판정
 * 기획문서 04 §3, 05 §3, 06 §4 를 실행 가능한 코드로 구현한다.
 *
 * 핵심 원칙: 표현은 사람이 고르지 않는다.
 * source_type 과 confidence 로부터 자동 결정되며, 근거가 없으면 표현이 자동으로 약해진다.
 */

export const SOURCE_TYPE = {
  OFFICIAL_PRODUCTION: 'official_production',   // 방송사·제작사·소속사
  OFFICIAL_INTERVIEW:  'official_interview',    // 공식 인터뷰 원문
  OFFICIAL_SOCIAL:     'official_social',       // 본인·소속사 공식 계정
  PUBLIC_INSTITUTION:  'public_institution',    // 관광공사·지자체·문화기관
  RELIABLE_MEDIA:      'reliable_media',        // 신뢰 언론
  AGGREGATE_DATA:      'aggregate_data',        // Google Trends, Naver DataLab 등 집계
  MERCHANT_OFFICIAL:   'merchant_official',     // 공식 브랜드·식당·호텔 사이트
  EDITORIAL:           'editorial',             // 자체 편집 판단
  NONE:                'none',
};

/** 사실 근거로 사용 금지 (06 §1) — 파이프라인이 즉시 폐기한다 */
export const BLOCKED_SOURCE_TYPES = [
  'anonymous_community',   // 익명 커뮤니티
  'fan_blog_unsourced',    // 출처 없는 팬 블로그
  'sighting',              // 목격담
  'private_account',       // 사생활 계정
  'reupload_description',  // 재편집 영상 설명
];

export const ALLOWED_WORDING = {
  OFFICIAL_FILMING_LOCATION: {
    id: 'official_filming_location',
    label: 'Official filming location',
    requires: [SOURCE_TYPE.OFFICIAL_PRODUCTION, SOURCE_TYPE.PUBLIC_INSTITUTION],
    minConfidence: 'high',
    tone: 'verified',
  },
  CONFIRMED_IN_INTERVIEW: {
    id: 'confirmed_in_interview',
    label: 'Confirmed in an official interview',
    requires: [SOURCE_TYPE.OFFICIAL_INTERVIEW],
    minConfidence: 'high',
    tone: 'verified',
  },
  OFFICIAL_SOCIAL_APPEARANCE: {
    id: 'official_social_appearance',
    label: 'Official social media appearance',
    requires: [SOURCE_TYPE.OFFICIAL_SOCIAL],
    minConfidence: 'high',
    tone: 'verified',
  },
  REPORTED_BY_MEDIA: {
    id: 'reported_by_media',
    label: 'Reported by reliable media',
    requires: [SOURCE_TYPE.RELIABLE_MEDIA],
    minConfidence: 'medium',
    tone: 'reported',
    /** 05 §3: 신뢰 언론 2곳 이상이어야 이 표현을 쓸 수 있다 */
    minSourceCount: 2,
  },
  INSPIRED_BY: {
    id: 'inspired_by',
    label: 'Inspired by the scene/look',
    requires: [SOURCE_TYPE.EDITORIAL, SOURCE_TYPE.NONE],
    minConfidence: 'low',
    tone: 'suggested',
  },
  SUGGESTED_NEARBY: {
    id: 'suggested_nearby',
    label: 'Suggested nearby experience',
    requires: [SOURCE_TYPE.EDITORIAL],
    minConfidence: 'low',
    tone: 'suggested',
  },
};

/**
 * 절대 금지 주제 (06 §2). 하나라도 걸리면 Red → 자동 폐기.
 * 운영자에게 판단을 요구하지 않는다 (05 §3).
 */
export const RED_FLAGS = [
  'residence_address',      // 현재·과거 상세 거주지
  'family_or_school',       // 가족·지인·학교
  'realtime_movement',      // 실시간 이동·목격
  'unverified_regular',     // 확인되지 않은 단골집
  'private_relationship',   // 비공개 연애
  'private_health',         // 비공개 건강
  'medical_claim',          // 스타와 결합한 의료효과·시술
  'stalking_route',         // 스토킹 유도 동선
  'minor_personal_info',    // 미성년 개인정보
  'unclear_image_rights',   // 권리 불명확 이미지
  'source_conflict',        // 출처 충돌
  'unsafe_place',           // 위험장소
];

export const RISK_GRADE = { GREEN: 'green', YELLOW: 'yellow', RED: 'red' };

/**
 * 위험등급 판정 (05 §3)
 * @returns {{grade: string, reasons: string[], wording: object|null}}
 */
export function gradeClaim({
  sourceTypes = [],
  sourceCount = 0,
  confidence = 'low',
  redFlags = [],
  placeVerified = false,
  imageRightsClear = true,
} = {}) {
  const reasons = [];

  // --- RED: 즉시 폐기 ---
  if (redFlags.length > 0) {
    return { grade: RISK_GRADE.RED, reasons: redFlags.map((f) => `red_flag:${f}`), wording: null };
  }
  if (sourceTypes.some((t) => BLOCKED_SOURCE_TYPES.includes(t))) {
    return { grade: RISK_GRADE.RED, reasons: ['blocked_source_type'], wording: null };
  }
  if (!imageRightsClear) {
    return { grade: RISK_GRADE.RED, reasons: ['unclear_image_rights'], wording: null };
  }

  const wording = resolveWording({ sourceTypes, sourceCount, confidence });

  // --- GREEN: 공식 출처 + 장소 확인 ---
  const hasOfficial = sourceTypes.some((t) =>
    [
      SOURCE_TYPE.OFFICIAL_PRODUCTION,
      SOURCE_TYPE.OFFICIAL_INTERVIEW,
      SOURCE_TYPE.OFFICIAL_SOCIAL,
      SOURCE_TYPE.PUBLIC_INSTITUTION,
    ].includes(t)
  );
  if (hasOfficial && placeVerified && confidence === 'high') {
    return { grade: RISK_GRADE.GREEN, reasons: ['official_source', 'place_verified'], wording };
  }
  if (!hasOfficial) reasons.push('no_official_source');
  if (!placeVerified) reasons.push('place_not_verified');

  // --- YELLOW: 유용하지만 단정 불가 → 표현 완화 후 발행 ---
  return { grade: RISK_GRADE.YELLOW, reasons, wording };
}

/** source/confidence 로부터 허용표현을 자동 선택한다. 근거가 없으면 가장 약한 표현으로 떨어진다. */
export function resolveWording({ sourceTypes = [], sourceCount = 0, confidence = 'low' }) {
  const order = [
    ALLOWED_WORDING.OFFICIAL_FILMING_LOCATION,
    ALLOWED_WORDING.CONFIRMED_IN_INTERVIEW,
    ALLOWED_WORDING.OFFICIAL_SOCIAL_APPEARANCE,
    ALLOWED_WORDING.REPORTED_BY_MEDIA,
    ALLOWED_WORDING.SUGGESTED_NEARBY,
    ALLOWED_WORDING.INSPIRED_BY,
  ];
  const rank = { low: 0, medium: 1, high: 2 };

  for (const w of order) {
    const sourceOk = w.requires.some((r) => sourceTypes.includes(r));
    const confOk = rank[confidence] >= rank[w.minConfidence];
    const countOk = !w.minSourceCount || sourceCount >= w.minSourceCount;
    if (sourceOk && confOk && countOk) return w;
  }
  return ALLOWED_WORDING.INSPIRED_BY;   // 기본값: 가장 약한 표현
}

/** 04 §4 콘텐츠 점수. 65점 미만은 발행하지 않는다. */
export const SCORE_WEIGHTS = {
  searchDemand:      25,
  fandomScale:       15,
  placeVerifiability:20,
  conversionPotential:20,
  originalUtility:   10,
  cultureConnection: 10,
};
export const PUBLISH_THRESHOLD = 65;

export function scoreTopic(scores = {}) {
  const total = Object.entries(SCORE_WEIGHTS).reduce((sum, [key, max]) => {
    const raw = Math.max(0, Math.min(1, scores[key] ?? 0));
    return sum + raw * max;
  }, 0);
  return { total: Math.round(total), passes: Math.round(total) >= PUBLISH_THRESHOLD };
}

/** 표준 고지문 (04 §2, 06 §5) */
export const NOTICES = {
  photoAngle:
    "This is a suggested photo angle for visitors, not the production's confirmed camera position.",
  affiliate:
    'This article contains affiliate links. We may earn a commission if you book or purchase through them, at no additional cost to you.',
  // 제휴 관계가 없을 때 쓰는 문구. 링크가 있다고 해서 제휴 고지를 띄우면
  // 받지도 않는 수수료를 받는다고 말하는 것이 된다 (2026-08-13 수정).
  noAffiliate:
    'These are plain links to merchants we think are useful. We are not in an affiliate relationship with them and earn nothing if you book or purchase. If that changes, this notice will change with it.',
  aiAssisted:
    'This article was researched, drafted and fact-checked with AI assistance under an editorial policy. Sources and the last verification date are listed above.',
  trendScore:
    'Trend stages are based on the public signals listed above. They reflect our internal prioritisation, not an objective ranking of nationwide popularity in Korea.',
};
