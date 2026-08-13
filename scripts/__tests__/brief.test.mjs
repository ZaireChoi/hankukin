/**
 * 발행 게이트 테스트.
 * 이 단계의 존재 이유는 '근거 없이 기사를 만들지 않는 것'이므로,
 * 가장 중요한 검증은 "출처가 없으면 절대 READY 가 되지 않는다" 이다.
 */
import assert from 'node:assert/strict';
import { buildBrief, renderBrief, classifyChannel, slugify, locationEvidence, GATE } from '../lib/brief.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); console.log('  ✓', n); pass++; } catch (e) { console.log('  ✗', n, '\n     ', e.message); fail++; } };

const base = {
  title: 'The East Palace', season: 'The East Palace: Limited Series',
  score: 0.63, rank: 6, weeksInTop10: 4, novelty: 'holding',
  charts: ['korea'], independentSources: 2, locationPotential: 1,
  locationNote: '사극·궁궐', youtube: { matched: true, method: 'search', relevant: 9, topViews: 3270895, strength: 0.519, samples: [] },
};

console.log('\n[1] 발행 게이트 — 근거 없이 통과할 수 없다');
t('촬영지 출처가 없으면 READY 가 되지 않는다', () => {
  const b = buildBrief(base, {});
  assert.equal(b.gate, GATE.NEEDS_LOCATION);
});
t('신호·점수가 아무리 좋아도 출처 없이는 막힌다', () => {
  const b = buildBrief({ ...base, score: 0.99, independentSources: 5 }, {});
  assert.equal(b.gate, GATE.NEEDS_LOCATION);
});
t('출처 배열만 있고 촬영 서술이 없으면 READY 가 아니다', () => {
  const known = { 'The East Palace': {
    places: [{ name: '경복궁', address: '서울 종로구' }],
    sources: [{ title: '제작사 보도자료', url: 'https://example.org/x', type: 'official_production', checkedAt: '2026-08-13' }],
  } };
  const b = buildBrief(base, known);
  assert.equal(b.gate, GATE.NEEDS_LOCATION);
});
t('공공기관이 촬영 사실을 서술하면 READY 가 된다', () => {
  const known = { 'The East Palace': {
    places: [{ name: '경복궁', nameKo: '경복궁',
      tourapi: { contentId: '1', address: '서울특별시 종로구', mentionsFilming: true,
                 filmingHits: ['촬영','드라마'], overview: '드라마 촬영지로 유명해졌다' } }],
    sources: [{ title: '한국관광공사', url: 'https://x', type: 'public_institution', checkedAt: '2026-08-13' }],
  } };
  const b = buildBrief(base, known);
  assert.equal(b.gate, GATE.READY);
  assert.equal(b.evidence.claimWording, 'official_filming_location');
});
t('신호가 1개면 출처가 있어도 보류된다', () => {
  const known = { 'The East Palace': { places: [], sources: [{ title: 'x', url: 'https://x', type: 'official_production', checkedAt: '2026-08-13' }] } };
  const b = buildBrief({ ...base, independentSources: 1 }, known);
  assert.equal(b.gate, GATE.NEEDS_SIGNAL);
});
t('스튜디오 예능은 아예 제외된다', () => {
  const b = buildBrief({ ...base, title: 'I am Solo', locationPotential: 0.2 }, {});
  assert.equal(b.gate, GATE.SKIP);
});

console.log('\n[1-B] 장소 근거 등급 (2026-08-13 실측)');
t('실측: 주문진 방파제는 촬영 서술이 확인된다', () => {
  const e = locationEvidence({ places: [{ nameKo: '주문진 방파제',
    tourapi: { contentId: '131271', mentionsFilming: true, filmingHits: ['촬영','드라마'] } }], sources: [] });
  assert.equal(e.filmingConfirmed, 1);
  assert.equal(e.claimWording, 'official_filming_location');
});
t('실측: 위양지는 장소만 확인되고 촬영 서술이 없다', () => {
  const e = locationEvidence({ places: [{ nameKo: '위양지',
    tourapi: { contentId: '2', mentionsFilming: false } }],
    sources: [{ type: 'public_institution' }] });
  assert.equal(e.filmingConfirmed, 0);
  assert.notEqual(e.claimWording, 'official_filming_location');
});
t('실측: 조회 실패 장소를 따로 센다 (주문진해수욕장)', () => {
  const e = locationEvidence({ places: [
    { nameKo: '주문진 방파제', tourapi: { contentId: '1', mentionsFilming: true } },
    { nameKo: '주문진해수욕장', tourapiAttempt: { status: 'not_found' } },
  ], sources: [] });
  assert.equal(e.resolved, 1);
  assert.equal(e.unresolved, 1);
  assert.deepEqual(e.unresolvedNames, ['주문진해수욕장']);
});

console.log('\n[1-C] 방문 가능성 검사 (연천 세트장 사례)');
t('모든 장소가 방문 불가면 NEEDS_ACCESS', () => {
  const known = { 'The East Palace': {
    places: [{ nameKo: '연천 오픈세트장', publicAccess: false,
      tourapi: { contentId: '9', mentionsFilming: true } }],
    sources: [{ type: 'public_institution' }] } };
  const b = buildBrief(base, known);
  assert.equal(b.gate, GATE.NEEDS_ACCESS);
});
t('방문 가능한 장소가 하나라도 있으면 통과한다', () => {
  const known = { 'The East Palace': {
    places: [
      { nameKo: '세트장', publicAccess: false, tourapi: { contentId: '9', mentionsFilming: true } },
      { nameKo: '고궁', tourapi: { contentId: '10', mentionsFilming: true } },
    ], sources: [{ type: 'public_institution' }] } };
  assert.equal(buildBrief(base, known).gate, GATE.READY);
});

console.log('\n[2] 공식 채널 판별');
t('방송사·플랫폼 채널을 공식으로 인정한다', () => {
  assert.equal(classifyChannel('SBS ').official, true);
  assert.equal(classifyChannel('Netflix Korea').official, true);
  assert.equal(classifyChannel('tvN Drama').official, true);
});
t('개인 채널은 공식이 아니다', () => {
  assert.equal(classifyChannel('귀조순').official, false);
  assert.equal(classifyChannel('ThrillVille').official, false);
});
t('공식 채널 증거가 촬영지 근거로 승격되지 않는다', () => {
  const b = buildBrief({ ...base, youtube: { ...base.youtube, samples: [
    { title: '예고편', channel: 'tvN', views: 100000 },
  ] } }, {});
  assert.equal(b.checks.officialChannelSeen, true);
  assert.equal(b.gate, GATE.NEEDS_LOCATION, '공식 채널을 봤다고 촬영지가 확인된 것은 아니다');
});

console.log('\n[3] 렌더링');
t('마크다운에 판정과 사유가 들어간다', () => {
  const md = renderBrief(buildBrief(base, {}));
  assert.match(md, /발행 불가/);
  assert.match(md, /지어내게 됩니다/);
  assert.ok(!md.includes('undefined'), 'undefined 가 노출되면 안 된다');
});
t('이전 형식(relevant 없음) 데이터도 깨지지 않는다', () => {
  const old = { ...base, youtube: { matched: true, method: 'search', topViews: 500000, strength: 0.3, samples: [] } };
  const md = renderBrief(buildBrief(old, {}));
  assert.ok(!md.includes('undefined'));
});
t('제목이 slug 로 변환된다', () => {
  assert.equal(slugify('Rookie Kim’s Stock Market Mission'), 'rookie-kims-stock-market-mission');
});

console.log(`\n결과: ${pass} 통과, ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
