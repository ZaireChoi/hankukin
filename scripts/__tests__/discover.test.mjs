/**
 * 촬영지 자동 발굴 테스트.
 *
 * 여기서 지키려는 것은 '많이 찾는 것' 이 아니라 '틀린 것을 넣지 않는 것' 이다.
 * 잘못된 촬영지 하나가 사이트 전체의 신뢰를 깎는다.
 */
import assert from 'node:assert/strict';
import { extractWorkTitles, mentionsFilming, regionOf } from '../lib/tourapi.mjs';
import { toFinding, indexByWork, mergeFindings, summarize, isVisitableType, SWEEP_KEYWORDS } from '../lib/discover.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); console.log('  ✓', n); pass++; } catch (e) { console.log('  ✗', n, '\n     ', e.message); fail++; } };

const deps = { extractWorkTitles, mentionsFilming, regionOf };
const place = (over = {}) => ({
  contentId: '131271', contentTypeId: '12', title: '주문진 방파제',
  address: '강원특별자치도 강릉시 주문진읍 해안로 1609', lat: 37.87, lng: 128.83, image: null, ...over,
});

console.log('\n[1] 조사 결과 만들기');
t('실측 소개글에서 작품과 지역을 함께 얻는다', () => {
  const f = toFinding(place(), '주문진 방파제는 드라마 <도깨비> 촬영지로 유명해졌다.', deps);
  assert.equal(f.mentionsFilming, true);
  assert.deepEqual(f.works.map((w) => w.title), ['도깨비']);
  assert.equal(f.region, '강원');
});
t('촬영 언급이 없으면 작품도 비어 있다 (실측: 위양지)', () => {
  const f = toFinding(place({ contentId: '1', title: '위양지' }),
    '위양지는 선량한 백성들을 위해 축조했다고 하여 붙여진 이름이다.', deps);
  assert.equal(f.mentionsFilming, false);
  assert.deepEqual(f.works, []);
});
t('소개글 조회에 실패해도 무너지지 않는다', () => {
  const f = toFinding(place(), null, deps);
  assert.equal(f.mentionsFilming, false);
  assert.equal(f.overviewExcerpt, null);
});

console.log('\n[2] 방문 가능 유형 선별');
t('관광지·문화시설은 통과', () => {
  assert.equal(isVisitableType('12'), true);
  assert.equal(isVisitableType('14'), true);
});
t('음식점·숙박·쇼핑은 제외 — 촬영지 기사 대상이 아니다', () => {
  assert.equal(isVisitableType('39'), false);   // 음식점
  assert.equal(isVisitableType('32'), false);   // 숙박
  assert.equal(isVisitableType('38'), false);   // 쇼핑
});

console.log('\n[3] 작품 기준 색인');
t('한 작품의 여러 장소를 모은다', () => {
  const findings = [
    toFinding(place({ contentId: 'a', title: '주문진 방파제' }), '드라마 <도깨비> 촬영지', deps),
    toFinding(place({ contentId: 'b', title: '용연사' }), '드라마 <도깨비> 촬영 장소', deps),
    toFinding(place({ contentId: 'c', title: '어떤 곳' }), '영화 <기생충> 촬영지', deps),
  ];
  const idx = indexByWork(findings);
  assert.equal(idx['도깨비'].length, 2);
  assert.equal(idx['기생충'].length, 1);
});
t('장소가 많은 작품이 앞에 온다 — 기사 한 편의 가치가 크다', () => {
  const findings = [
    toFinding(place({ contentId: 'a' }), '영화 <기생충> 촬영지', deps),
    toFinding(place({ contentId: 'b' }), '드라마 <도깨비> 촬영지', deps),
    toFinding(place({ contentId: 'c' }), '드라마 <도깨비> 촬영지', deps),
  ];
  assert.equal(Object.keys(indexByWork(findings))[0], '도깨비');
});

console.log('\n[4] 이어달리기 — 쿼터 때문에 나눠 돌린다');
t('이전 결과와 합친다', () => {
  const prev = [toFinding(place({ contentId: 'a' }), '드라마 <도깨비> 촬영지', deps)];
  const next = [toFinding(place({ contentId: 'b' }), '영화 <기생충> 촬영지', deps)];
  assert.equal(mergeFindings(prev, next).length, 2);
});
t('같은 장소는 새 결과로 덮는다 — 소개글이 갱신될 수 있다', () => {
  const prev = [toFinding(place({ contentId: 'a' }), '관광 소개만 있음', deps)];
  const next = [toFinding(place({ contentId: 'a' }), '드라마 <도깨비> 촬영지', deps)];
  const merged = mergeFindings(prev, next);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].works.map((w) => w.title), ['도깨비']);
});

console.log('\n[5] 요약');
t('조사·언급·작품확인을 구분해서 센다', () => {
  const findings = [
    toFinding(place({ contentId: 'a' }), '드라마 <도깨비> 촬영지', deps),
    toFinding(place({ contentId: 'b' }), '영화 촬영이 있었다고 전해진다', deps),  // 언급만, 작품 불명
    toFinding(place({ contentId: 'c' }), '조용한 산책로다', deps),
  ];
  const s = summarize(findings);
  assert.equal(s.scanned, 3);
  assert.equal(s.filmingMentioned, 2);
  assert.equal(s.workIdentified, 1);
});

console.log('\n[6] 훑기 키워드');
t('키워드가 비어 있지 않고 중복이 없다', () => {
  assert.ok(SWEEP_KEYWORDS.length >= 4);
  assert.equal(new Set(SWEEP_KEYWORDS).size, SWEEP_KEYWORDS.length);
});

console.log(`\n결과: ${pass} 통과, ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
