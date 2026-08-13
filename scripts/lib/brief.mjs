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
  NEEDS_SIGNAL: 'needs_signal',       // 독립 신호 부족
  SKIP: 'skip',                        // 촬영지가 나올 수 없는 유형
};

/**
 * 브리프 하나를 만든다.
 * @param {object} c  collect-releases 의 candidate
 * @param {object} known  운영자/이전 조사로 확보된 촬영지 출처 (data/locations.json)
 */
export function buildBrief(c, known = {}) {
  const locations = known[c.title] ?? null;

  const officialEvidence = (c.youtube?.samples ?? [])
    .map((s) => ({ ...s, channel: s.channel, ...classifyChannel(s.channel) }))
    .filter((s) => s.official);

  const checks = {
    onKoreaChart: (c.charts ?? []).includes('korea'),
    independentSources: c.independentSources ?? 1,
    hasTwoSignals: (c.independentSources ?? 1) >= 2,
    officialChannelSeen: officialEvidence.length > 0,
    hasVerifiedLocation: Boolean(locations?.sources?.length),
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
    reason = '촬영지 출처가 없습니다. 이 상태로 초안을 만들면 장소를 지어내게 됩니다.';
  } else {
    gate = GATE.READY;
    reason = '촬영지 출처가 확보되어 초안 생성이 가능합니다.';
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
    officialEvidence: officialEvidence.slice(0, 3),
    buzz: c.youtube?.matched
      ? { method: c.youtube.method, relevant: c.youtube.relevant, topViews: c.youtube.topViews, strength: c.youtube.strength }
      : null,
    locations,
    gate,
    reason,
    /** 아직 채워지지 않은 것 — 사람이 확인해야 할 목록 */
    missing: buildMissing(checks, locations),
  };
}

function buildMissing(checks, locations) {
  const m = [];
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

  if (b.locations?.sources?.length) {
    lines.push('## 확보된 촬영지', '');
    for (const loc of b.locations.places ?? []) {
      lines.push(`- **${loc.name}** — ${loc.address ?? '주소 확인 필요'}`);
    }
    lines.push('', '### 출처', '');
    for (const s of b.locations.sources) lines.push(`- [${s.title}](${s.url}) · ${s.type} · 확인일 ${s.checkedAt}`);
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
