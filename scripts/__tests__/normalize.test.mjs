/**
 * 2026-08-13 실제 Naver DataLab 응답으로 검증한다.
 * 목적: "진행 중인 주"와 "측정 불가"가 하락으로 오판되지 않는지 확인.
 * 실행: node scripts/__tests__/normalize.test.mjs
 */
import assert from 'node:assert/strict';
import {
  dropIncompletePeriod, normalizeAgainstAnchor, momentum,
  evaluateStage, SIGNAL_STATUS, STAGE,
} from '../lib/normalize.mjs';

const TODAY = new Date('2026-08-13T00:00:00Z');

// 실제 관측 응답 (축약 없이 그대로)
const REAL = [
  { title: '두바이스크림', data: [] },
  { title: '약과', data: [
    {period:'2026-04-27',ratio:94.00594},{period:'2026-05-04',ratio:89.54472},
    {period:'2026-05-11',ratio:88.44657},{period:'2026-05-18',ratio:85.74696},
    {period:'2026-05-25',ratio:78.38023},{period:'2026-06-01',ratio:79.68428},
    {period:'2026-06-08',ratio:83.2075},{period:'2026-06-15',ratio:76.22969},
    {period:'2026-06-22',ratio:76.45847},{period:'2026-06-29',ratio:77.00754},
    {period:'2026-07-06',ratio:89.06428},{period:'2026-07-13',ratio:76.34408},
    {period:'2026-07-20',ratio:77.00754},{period:'2026-07-27',ratio:72.18027},
    {period:'2026-08-03',ratio:76.89315},{period:'2026-08-10',ratio:26.01235},
  ]},
  { title: '탕후루', data: [
    {period:'2026-04-27',ratio:71.44818},{period:'2026-05-04',ratio:89.27018},
    {period:'2026-05-11',ratio:72.20315},{period:'2026-05-18',ratio:80.85106},
    {period:'2026-05-25',ratio:82.40677},{period:'2026-06-01',ratio:100},
    {period:'2026-06-08',ratio:77.12194},{period:'2026-06-15',ratio:75.26881},
    {period:'2026-06-22',ratio:73.53008},{period:'2026-06-29',ratio:72.86662},
    {period:'2026-07-06',ratio:60.62685},{period:'2026-07-13',ratio:66.04895},
    {period:'2026-07-20',ratio:63.98993},{period:'2026-07-27',ratio:72.31754},
    {period:'2026-08-03',ratio:79.75291},{period:'2026-08-10',ratio:18.5541},
  ]},
];

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); console.log('  ✓', name); pass++; }
                          catch (e) { console.log('  ✗', name, '\n     ', e.message); fail++; } };

console.log('\n[1] 진행 중인 주 제거');
t('마지막 미완료 구간(2026-08-10)을 버린다', () => {
  const out = dropIncompletePeriod(REAL[1].data, 'week', TODAY);
  assert.equal(out.length, 15);
  assert.equal(out[out.length - 1].period, '2026-08-03');
});
t('미완료 구간을 남기면 -66% 라는 가짜 폭락이 만들어진다', () => {
  const raw = REAL[1].data;
  const fakeDrop = (raw[15].ratio - raw[14].ratio) / raw[14].ratio;
  assert.ok(fakeDrop < -0.6, '실제로 -60% 이상 급락으로 보임');
});

console.log('\n[2] 측정 불가와 하락의 구분');
t('빈 배열은 insufficient_volume 이며 하락이 아니다', () => {
  const n = normalizeAgainstAnchor(REAL, '약과', 'week', TODAY);
  const dubai = n.find((x) => x.topic === '두바이스크림');
  assert.equal(dubai.status, SIGNAL_STATUS.INSUFFICIENT_VOLUME);
  assert.equal(dubai.points.length, 0);
});

console.log('\n[3] 앵커 대비 정규화');
t('앵커(약과) 대비 비율이 계산된다', () => {
  const n = normalizeAgainstAnchor(REAL, '약과', 'week', TODAY);
  const t9 = n.find((x) => x.topic === '탕후루');
  assert.equal(t9.status, SIGNAL_STATUS.OK);
  assert.equal(t9.points.length, 15);
  const first = t9.points[0];
  assert.ok(Math.abs(first.vsAnchor - 71.44818 / 94.00594) < 1e-6);
});
t('미완료 구간 제거 후 탕후루 모멘텀은 폭락이 아니다', () => {
  const n = normalizeAgainstAnchor(REAL, '약과', 'week', TODAY);
  const m = momentum(n.find((x) => x.topic === '탕후루').points);
  assert.ok(m > -0.25, `모멘텀 ${m} 은 cooling 임계치보다 위여야 한다`);
});

console.log('\n[4] 단일 신호 상한 규칙 (05 §8)');
t('신호가 1개면 아무리 급등해도 emerging 을 넘지 못한다', () => {
  const r = evaluateStage({ signals: [{ source: 'search', status: 'ok', momentum: 3.0 }], weeksObserved: 20 });
  assert.equal(r.stage, STAGE.EMERGING);
  assert.equal(r.label, 'Emerging online signal');
  assert.equal(r.independentSources, 1);
});
t('독립 신호 2개 + 강한 상승이면 hot 이 가능하다', () => {
  const r = evaluateStage({ signals: [
    { source: 'search', status: 'ok', momentum: 0.8 },
    { source: 'shopping', status: 'ok', momentum: 0.6 },
  ], weeksObserved: 6 });
  assert.equal(r.stage, STAGE.HOT);
});
t('같은 소스 2건은 독립 신호 2개로 치지 않는다', () => {
  const r = evaluateStage({ signals: [
    { source: 'search', status: 'ok', momentum: 0.9 },
    { source: 'search', status: 'ok', momentum: 0.9 },
  ], weeksObserved: 20 });
  assert.equal(r.stage, STAGE.EMERGING);
});
t('사용 가능한 신호가 없으면 발행 불가', () => {
  const r = evaluateStage({ signals: [{ source: 'search', status: 'insufficient_volume' }] });
  assert.equal(r.publishable, false);
});

console.log(`\n결과: ${pass} 통과, ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
