/**
 * 조사 브리프 생성 — 자동 발행 파이프라인 1단계.
 *
 * 이 모듈은 기사를 쓰지 않는다. '쓸 수 있는가'를 판정한다.
 *
 * 왜 이렇게 나눴는가:
 *   레이더는 'The East Palace 가 주목할 만하다'까지만 알려준다. 기사를 쓰려면
 *   촬영지가 어디인지 알아야 하고, 그건 공식 발표나 제작사 자료가 있어야 한다.
 *   근거가 없는 상태에서 초안 생성을 맡기면 AI 는 그럴듯한 촬영지를 지어낸다.
 *   문서 04 §5 는 '출처 없는 주장'을 금지하고, 06 §1 은 사실 근거의 출처를 제한한다.
 *   그 규칙을 '초안을 쓰기 전에' 강제하는 것이 이 단계의 역할이다.
 *
 * 현재 한계 (2026-08-13):
 *   네이버 검색 API 가 제휴 심사 중이라 촬영지 출처를 자동 탐색할 수단이 없다.
 *   따라서 이 단계는 '수집된 신호로부터 확인 가능한 것'만 정리하고,
 *   나머지는 '확인 필요' 로 남긴 뒤 발행을 차단한다. 빈칸을 상상으로 채우지 않는다.
 */

/** 공식 채널로 인정하는 방송사·플랫폼 (06 §1 화이트리스트) */
export const OFFICIAL_CHANNELS = [
  'netflix', '넷플릭스', 'tvn', 'sbs', 'kbs', 'mbc', 'jtbc', 'ena', 'tving', 'ocn',
  'channel a', '채널a', 'wavve', 'disney',
];

export function classifyChannel(name = '') {
  const n = String(name).toLowerCase();
  const hit = OFFICIAL_CHANNELS.find((c) => n.includes(c));
  return hit ? { official: true, matched: hit } : { official: false, matched: null };
}

/** 발행 게이트. 촬영지 근거가 없으면 통과할 수 없다. */
export const GATE = {
  READY: 'ready',                     // 촬영지 출처 확보 — 초안 생성 가능
  NEEDS_LOCATION: 'needs_location',   // 작품은 확인, 촬영지 근거 없음
  NEEDS_ACCESS: 'needs_access',       // 촬영지는 확인, 방문 불가
  NEEDS_SIGNAL: 'needs_signal',       // 독립 신호 부족
  SKIP: 'skip',                        // 촬영지가 나올 수 없는 유형
};

/** 게이트를 열 수 있는 출처 등급 (06 §1) */
const STRONG_SOURCE_TYPES = [
  'official_production', 'official_interview', 'official_social', 'public_institution',
];

/**
 * 장소 근거를 등급별로 집계한다.
 *
 * 핵심 구분 — 2026-08-13 실측에서 배운 것:
 *   '장소가 실재한다' 와 '그 장소가 촬영지다' 는 다른 주장이다.
 *   한국관광공사가 위양지를 소개한다고 해서 동궁 촬영지가 되는 것은 아니다.
 *   반대로 주문진 방파제 소개글에는 "드라마 촬영지로 유명해졌다" 가 들어있고,
 *   그건 공공기관이 촬영 사실을 직접 서술한 것이므로 등급이 다르다.
 */
export function locationEvidence(locations) {
  const places = locations?.places ?? [];
  const sources = locations?.sources ?? [];

  const resolved = places.filter((p) => p.tourapi?.contentId);
  const filmingConfirmed = resolved.filter((p) => p.tourapi?.mentionsFilming === true);
  const unresolved = places.filter((p) => !p.tourapi?.contentId);
  const strongSources = sources.filter((s) => STRONG_SOURCE_TYPES.includes(s.type));

  // 방문 가능성. publicAccess 가 명시적으로 false 인 것만 제외한다 (미지정은 통과).
  const visitable = places.filter((p) => p.publicAccess !== false);
  const allBlocked = places.length > 0 && visitable.length === 0;

  // 어떤 표현까지 허용되는가 (04 §3)
  let claimWording = 'inspired_by';
  if (filmingConfirmed.length > 0) claimWording = 'official_filming_location';
  else if (strongSources.length > 0 && resolved.length > 0) claimWording = 'suggested_nearby';

  return {
    places: places.length,
    resolved: resolved.length,
    unresolved: unresolved.length,
    filmingConfirmed: filmingConfirmed.length,
    strongSources: strongSources.length,
    visitable: visitable.length,
    allBlocked,
    claimWording,
    confirmedPlaceNames: filmingConfirmed.map((p) => p.nameKo ?? p.name),
    unresolvedNames: unresolved.map((p) => p.nameKo ?? p.name),
  };
}

/**
 * 브리프 하나를 만든다.
 * @param {object} c  collect-releases 의 candidate
 * @param {object} known  운영자/이전 조사로 확보된 촬영지 출처 (data/locations.json)
 */
export function buildBrief(c, known = {}) {
  const locations = known[c.title] ?? null;
  const evidence = locationEvidence(locations);

  const officialEvidence = (c.youtube?.samples ?? [])
    .map((s) => ({ ...s, channel: s.channel, ...classifyChannel(s.channel) }))
    .filter((s) => s.official);

  const checks = {
    onKoreaChart: (c.charts ?? []).includes('korea'),
    independentSources: c.independentSources ?? 1,
    hasTwoSignals: (c.independentSources ?? 1) >= 2,
    officialChannelSeen: officialEvidence.length > 0,
    // '출처가 배열에 있다' 가 아니라 '공공기관이 촬영 사실을 서술했다' 를 본다
    hasVerifiedLocation: evidence.filmingConfirmed > 0,
    resolvedPlaces: evidence.resolved,
    unresolvedPlaces: evidence.unresolved,
    strongSources: evidence.strongSources,
    visitablePlaces: evidence.visitable,
    locationPotential: c.locationPotential ?? 0,
  };

  let gate, reason;
  if (checks.locationPotential <= 0.2) {
    gate = GATE.SKIP;
    reason = '스튜디오 중심 예능 — 방문 가능한 촬영지가 나올 가능성이 낮습니다.';
  } else if (!checks.hasTwoSignals) {
    gate = GATE.NEEDS_SIGNAL;
    reason = `독립 신호가 ${checks.independentSources}개입니다. 2개 미만이면 "Emerging" 이상으로 표기할 수 없어 기사 가치가 낮습니다.`;
  } else if (!checks.hasVerifiedLocation) {
    gate = GATE.NEEDS_LOCATION;
    reason = evidence.resolved > 0
      ? `장소 ${evidence.resolved}곳이 확인됐지만, 공공기관이 촬영 사실을 서술한 근거가 없습니다. 장소가 실재하는 것과 그곳이 촬영지인 것은 다른 주장입니다.`
      : '촬영지 출처가 없습니다. 이 상태로 초안을 만들면 장소를 지어내게 됩니다.';
  } else if (evidence.allBlocked) {
    gate = GATE.NEEDS_ACCESS;
    reason = '촬영지는 확인됐지만 모든 장소가 방문 불가입니다. 방문할 수 없는 곳은 Visit Korea 콘텐츠가 되지 않습니다.';
  } else {
    gate = GATE.READY;
    reason = `공공기관이 촬영 사실을 서술한 장소 ${evidence.filmingConfirmed}곳을 확보했습니다. `
           + `허용 표현: ${evidence.claimWording}.`;
  }

  return {
    title: c.title,
    season: c.season ?? '',
    slug: slugify(c.title),
    radarScore: c.score,
    rank: c.rank,
    weeksInTop10: c.weeksInTop10,
    novelty: c.novelty,
    locationNote: c.locationNote,
    checks,
    evidence,
    officialEvidence: officialEvidence.slice(0, 3),
    buzz: c.youtube?.matched
      ? { method: c.youtube.method, relevant: c.youtube.relevant, topViews: c.youtube.topViews, strength: c.youtube.strength }
      : null,
    locations,
    gate,
    reason,
    /** 아직 채워지지 않은 것 — 사람이 확인해야 할 목록 */
    missing: buildMissing(checks, locations, evidence),
  };
}

function buildMissing(checks, locations, evidence = {}) {
  const m = [];
  if (evidence.unresolved > 0) {
    m.push({
      item: `장소 조회 실패 ${evidence.unresolved}곳 — ${(evidence.unresolvedNames ?? []).join(', ')}`,
      whereToLook: ['한국관광공사 등재명 확인 (이름 표기가 다를 수 있음)', 'locations.json 의 nameKo 를 등재명으로 수정'],
      required: false,
      note: 'TourAPI 키워드 변형을 모두 시도했으나 0건입니다. 등재명이 다르거나 미등재일 수 있습니다.',
    });
  }
  if (!checks.hasVerifiedLocation) {
    m.push({
      item: '촬영지와 그 출처',
      whereToLook: [
        '제작사·방송사 공식 SNS 및 보도자료',
        '한국관광공사 대한민국구석구석 (촬영지 소개)',
        '촬영 지역 지자체 관광포털',
      ],
      required: true,
      note: '기획문서 04 §3 기준으로 "Official filming location" 을 쓰려면 제작사 또는 공공기관 출처가 필요합니다.',
    });
  }
  if (!checks.hasTwoSignals) {
    m.push({
      item: '두 번째 독립 신호',
      whereToLook: ['네이버 뉴스(제휴 승인 대기 중)', '데이터랩 검색 트렌드(승인 대기 중)'],
      required: false,
      note: '신호 1개로는 Emerging 을 넘을 수 없습니다 (05 §8).',
    });
  }
  if (locations?.sources?.length) {
    m.push({
      item: '장소 운영상태·교통·비용 확인',
      whereToLook: ['공식 홈페이지', '지도 서비스 영업정보'],
      required: true,
      note: '05 §4 — 영구폐업 시 예약 CTA 를 제거해야 합니다.',
    });
  }
  return m;
}

export function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[’'"]/g, '')
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** 브리프를 사람이 읽는 마크다운으로 */
export function renderBrief(b) {
  const gateLabel = {
    [GATE.READY]: '✅ 초안 생성 가능',
    [GATE.NEEDS_LOCATION]: '⛔ 발행 불가 — 촬영지 근거 없음',
    [GATE.NEEDS_ACCESS]: '⛔ 발행 불가 — 방문 불가 장소',
    [GATE.NEEDS_SIGNAL]: '⚠️ 보류 — 독립 신호 부족',
    [GATE.SKIP]: '⏭️ 제외 — 촬영지 부적합',
  }[b.gate];

  const lines = [
    `# ${b.title}`,
    b.season && b.season !== b.title ? `> ${b.season}` : '',
    '',
    `**판정: ${gateLabel}**`,
    '',
    b.reason,
    '',
    '## 레이더 신호',
    '',
    '| 항목 | 값 |',
    '|---|---|',
    `| 레이더 점수 | ${b.radarScore} |`,
    `| 한국 Netflix 순위 | ${b.rank}위 (${b.weeksInTop10}주차) |`,
    `| 신규성 | ${b.novelty} |`,
    `| 독립 신호 | ${b.checks.independentSources}개 |`,
    `| 촬영지 적합도 | ${b.checks.locationPotential} — ${b.locationNote} |`,
    b.buzz
      ? `| YouTube 화제성 | ${b.buzz.relevant != null ? `관련영상 ${b.buzz.relevant}건, ` : ''}최고 ${(b.buzz.topViews ?? 0).toLocaleString()}회 (강도 ${b.buzz.strength ?? '—'}) |`
      : '| YouTube 화제성 | 근거 없음 |',
    '',
  ];

  if (b.officialEvidence.length) {
    lines.push('## 공식 채널 확인', '',
      '작품의 실재와 출연진은 아래 공식 채널 영상으로 확인됩니다. **다만 이것은 촬영지 근거가 아닙니다.**', '');
    for (const e of b.officialEvidence) {
      lines.push(`- **${e.channel}** — ${e.title} (${e.views.toLocaleString()}회)`);
    }
    lines.push('');
  }

  if (b.evidence?.places > 0) {
    lines.push('## 장소 근거', '',
      '| 항목 | 값 |', '|---|---|',
      `| 등록된 장소 | ${b.evidence.places}곳 |`,
      `| 공공기관 데이터 확인 | ${b.evidence.resolved}곳 |`,
      `| **촬영 사실 서술 확인** | **${b.evidence.filmingConfirmed}곳** |`,
      `| 조회 실패 | ${b.evidence.unresolved}곳 |`,
      `| 허용 표현 | \`${b.evidence.claimWording}\` |`,
      '');
    for (const loc of b.locations?.places ?? []) {
      const ta = loc.tourapi;
      const mark = ta?.mentionsFilming ? '✓ 촬영 서술' : ta ? '· 장소만 확인' : '✗ 미확인';
      lines.push(`- **${loc.nameKo ?? loc.name}** — ${ta?.address ?? loc.address ?? '주소 미확인'} · ${mark}`);
      if (ta?.mentionsFilming && ta.overview) {
        lines.push(`  > ${ta.overview.slice(0, 160).replace(/\n/g, ' ')}...`);
      }
    }
    lines.push('', '### 출처', '');
    for (const s of b.locations?.sources ?? []) {
      lines.push(`- [${s.title}](${s.url}) · ${s.type} · 확인일 ${s.checkedAt}${s.attribution ? ` · ${s.attribution}` : ''}`);
    }
    lines.push('');
  }

  if (b.missing.length) {
    lines.push('## 채워야 할 것', '');
    for (const m of b.missing) {
      lines.push(`### ${m.required ? '필수' : '선택'} — ${m.item}`, '');
      lines.push(m.note, '');
      lines.push('확인할 곳:');
      for (const w of m.whereToLook) lines.push(`- ${w}`);
      lines.push('');
    }
  }

  lines.push('---', '',
    '이 브리프는 자동 생성되었으며 **기사가 아닙니다.** 촬영지 출처가 채워지기 전에는',
    '초안 생성 단계로 넘어가지 않습니다. 빈칸을 추정으로 메우지 마세요 — 그것이 이 단계의 존재 이유입니다.');

  // 빈 줄은 마크다운 구조상 필요하다. 3줄 이상 연속만 정리한다.
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '') + '\n';
}
