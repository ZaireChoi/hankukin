/**
 * 촬영지 자동 발굴 테스트.
 *
 * 여기서 지키려는 것은 '많이 찾는 것' 이 아니라 '틀린 것을 넣지 않는 것' 이다.
 * 잘못된 촬영지 하나가 사이트 전체의 신뢰를 깎는다.
 */
import assert from 'node:assert/strict';
import { extractWorkTitles, mentionsFilming, regionOf } from '../lib/tourapi.mjs';
import { toFinding, indexByWork, mergeFindings, summarize, isVisitableType, SWEEP_KEYWORDS,
         detectRedaction, extractFromPlaceName,
         KPOP_SWEEP_KEYWORDS, mentionsKpop, extractArtists, indexByArtist } from '../lib/discover.mjs';

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

console.log('\n[6] 상류 결손 감지 — 한국관광공사 쪽에서 이미 지워진 건');
t('실측: "드라마 가 처음 촬영되었고" 를 결손으로 본다', () => {
  assert.equal(detectRedaction('2010년 MBC 드라마 가 처음 촬영되었고, 이후 , , , , 등의').redacted, true);
});
t('실측: "SBS 드라마 의 촬영지이다" 를 결손으로 본다', () => {
  assert.equal(detectRedaction('2016년 방영되었던 SBS 드라마 의 촬영지이다.').redacted, true);
});
t('실측: 등재명 "해양드라마세트장 ( 촬영지)" 를 결손으로 본다', () => {
  assert.equal(detectRedaction('해양드라마세트장 ( 촬영지)').redacted, true);
});
t('정상 문장을 결손으로 오인하지 않는다', () => {
  assert.equal(detectRedaction('주문진 방파제는 드라마 <도깨비> 촬영지로 유명해졌다.').redacted, false);
  assert.equal(detectRedaction('드라마 <킹덤>, <슈룹> 을 촬영한 세트장이다.').redacted, false);
});
t('결손은 표시만 하고 작품을 지어내지 않는다', () => {
  const f = toFinding(place({ contentId: 'x', title: '해양드라마세트장 ( 촬영지)' }),
    '2010년 MBC 드라마 가 처음 촬영되었고, 이후 , , , , 등의 드라마가 촬영됐다.', deps);
  assert.equal(f.upstreamRedacted, true);
  assert.deepEqual(f.works, []);
});

console.log('\n[7] 등재명에서 작품 복구 — 소개글이 지워졌을 때의 마지막 수단');
t('실측: 낭만닥터김사부촬영지 에서 작품을 얻는다', () => {
  const r = extractFromPlaceName('낭만닥터김사부촬영지', '경기도 포천시 영북면');
  assert.equal(r.title, '낭만닥터김사부');
  assert.deepEqual(r.evidence, ['등재명']);
});
t('실측: "태양의 후예 촬영지" 처럼 띄어쓴 형태도 된다', () => {
  assert.equal(extractFromPlaceName('태양의 후예 촬영지', '강원특별자치도 태백시').title, '태양의 후예');
});
t('실측: 지명을 작품으로 오인하지 않는다 (문경새재·완도)', () => {
  assert.equal(extractFromPlaceName('문경새재 오픈세트장', '경상북도 문경시 문경읍'), null);
  assert.equal(extractFromPlaceName('완도 청해포구촬영장', '전라남도 완도군 완도읍'), null);
});
t('실측: 일반어가 섞인 이름은 거르낸다 (순천 드라마촬영장)', () => {
  assert.equal(extractFromPlaceName('순천 드라마촬영장', '전라남도 순천시'), null);
  assert.equal(extractFromPlaceName('해양드라마세트장', '경상남도 창원시'), null);
});
t('접미사가 없으면 아무것도 뽑지 않는다', () => {
  assert.equal(extractFromPlaceName('경복궁', '서울특별시 종로구'), null);
});
t('소개글 추출이 되면 등재명을 중복으로 넣지 않는다', () => {
  const f = toFinding(place({ contentId: 'y', title: '웰컴투동막골촬영지', address: '강원특별자치도 평창군' }),
    "영화 '웰컴투동막골' 의 촬영지로 알려진 곳이다.", deps);
  assert.equal(f.works.filter((w) => w.title === '웰컴투동막골').length, 1);
});

console.log('\n[8] K-pop 성지 — 1회차에 실제로 잡힌 BTS 버스정류장이 기준이다');
const BTS_TITLE = '주문진읍 BTS 앨범사진 촬영지 (버스정류장)';
const BTS_OVERVIEW = 'BTS 버스 정류장은 강릉 주문진 해변에 위치한 BTS 앨범재킷 촬영장소로 많은 국내외 관광객들이 찾고 있는 핫 플레이스다. K-POP 최초로 미국 빌보드 음반차트 1위를 기록한 방탄소년단의 앨범재킷 사진 속에서 등장한 바닷가 버스 정류장이다. (출처 : 강릉시청)';

t('K-pop 문맥을 인식한다', () => {
  const r = mentionsKpop(BTS_OVERVIEW);
  assert.equal(r.mentioned, true);
  assert.ok(r.hits.includes('K-POP'));
});
t('드라마 소개글을 K-pop 으로 오인하지 않는다', () => {
  assert.equal(mentionsKpop('주문진 방파제는 드라마 <도깨비> 촬영지로 유명해졌다.').mentioned, false);
});
t('실측: BTS 를 아티스트로 뽑는다', () => {
  const a = extractArtists(`${BTS_TITLE} ${BTS_OVERVIEW}`, { extractWorkTitles });
  assert.ok(a.some((x) => x.title === 'BTS'), JSON.stringify(a));
});
t('방송사 약어를 아티스트로 잡지 않는다 — 이걸 틀리면 기능이 무용지물이다', () => {
  const a = extractArtists('MBC 와 SBS 가 촬영한 K-POP 프로그램. KBS 아이돌 무대.', { extractWorkTitles });
  assert.deepEqual(a.map((x) => x.title), []);
});
t('K-pop 문맥이 없으면 약어를 뽑지 않는다', () => {
  assert.deepEqual(extractArtists('KTX 로 갈 수 있는 ATM 이 있는 곳', { extractWorkTitles }), []);
});
t('실측: BTS 정류장은 K-pop 성지이면서 드라마 작품은 없다', () => {
  const f = toFinding(place({ contentId: 'bts', title: BTS_TITLE, address: '강원특별자치도 강릉시 주문진읍' }),
    BTS_OVERVIEW, deps, { kind: 'kpop' });
  assert.equal(f.isKpopPlace, true);
  assert.equal(f.kind, 'kpop');
  assert.ok(f.artists.some((a) => a.title === 'BTS'));
  assert.deepEqual(f.works, []);
});
t('아티스트 색인이 드라마 색인과 섞이지 않는다', () => {
  const findings = [
    toFinding(place({ contentId: 'bts', title: BTS_TITLE }), BTS_OVERVIEW, deps, { kind: 'kpop' }),
    toFinding(place({ contentId: 'gob' }), '드라마 <도깨비> 촬영지', deps, { kind: 'drama' }),
  ];
  const { byArtist } = indexByArtist(findings);
  assert.ok(byArtist['BTS']);
  assert.equal(byArtist['도깨비'], undefined);
  assert.equal(indexByWork(findings)['BTS'], undefined);
});
t('아티스트를 못 뽑아도 K-pop 장소로는 남긴다', () => {
  const f = toFinding(place({ contentId: 'z', title: '한류스타 거리' }),
    '한류 아이돌 팬덤이 즐겨 찾는 거리다.', deps, { kind: 'kpop' });
  const { byArtist, unnamed } = indexByArtist([f]);
  assert.equal(Object.keys(byArtist).length, 0);
  assert.equal(unnamed.length, 1);
});

console.log('\n[9] 훑기 키워드');
t('키워드가 비어 있지 않고 중복이 없다', () => {
  assert.ok(SWEEP_KEYWORDS.length >= 4);
  assert.equal(new Set(SWEEP_KEYWORDS).size, SWEEP_KEYWORDS.length);
  assert.ok(KPOP_SWEEP_KEYWORDS.length >= 4);
  assert.equal(new Set(KPOP_SWEEP_KEYWORDS).size, KPOP_SWEEP_KEYWORDS.length);
});

console.log(`\n결과: ${pass} 통과, ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
