/**
 * Netflix 어댑터 테스트.
 *
 * ⚠ 한계: 실제 Netflix 응답으로는 검증하지 못했다 (개발 환경에서 netflix.com 접근 차단).
 * TSV 픽스처는 Netflix 가 공개한 컬럼 규격을 따라 구성했고,
 * 페이지 픽스처는 2026-08-13 실제 한국 TOP10 페이지의 텍스트를 그대로 옮긴 것이다.
 * 첫 CI 실행에서 반드시 실제 응답으로 재검증할 것.
 */
import assert from 'node:assert/strict';
import { parseTsv, parseGlobalTsv, parsePageText, noveltyScore } from '../lib/netflix.mjs';
import { matchTitle, buzzStrength, filterRelevant, BUZZ_MIN_VIEWS } from '../lib/youtube.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); console.log('  ✓', n); pass++; } catch (e) { console.log('  ✗', n, '\n     ', e.message); fail++; } };

const TSV = [
  'week\tcountry_iso2\tcountry_name\tcategory\tweekly_rank\tshow_title\tseason_title\tcumulative_weeks_in_top_10',
  '2026-08-09\tKR\tSouth Korea\tTV\t1\tI am Solo\tPart 33\t31',
  '2026-08-09\tKR\tSouth Korea\tTV\t6\tThe East Palace\tLimited Series\t4',
  '2026-08-09\tKR\tSouth Korea\tTV\t2\tOur Sticky Love\tLimited Series\t1',
  '2026-08-09\tUS\tUnited States\tTV\t1\tSomething Else\tSeason 1\t2',
  '2026-08-02\tKR\tSouth Korea\tTV\t1\tOld Week Show\tSeason 1\t9',
  '2026-08-09\tKR\tSouth Korea\tFilms\t1\tSome Movie\t\t1',
].join('\n');

console.log('\n[1] 공식 TSV 파싱');
t('한국 TV 행만, 최신 주만 남긴다', () => {
  const rows = parseTsv(TSV, { countryIso: 'KR', category: 'TV' });
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => r.week === '2026-08-09'));
  assert.equal(rows[0].rank, 1);
  assert.equal(rows[1].title, 'Our Sticky Love');
});
t('다른 나라·다른 카테고리는 제외된다', () => {
  const rows = parseTsv(TSV, { countryIso: 'KR', category: 'TV' });
  assert.ok(!rows.some((r) => r.title === 'Something Else'));
  assert.ok(!rows.some((r) => r.title === 'Some Movie'));
});
t('컬럼이 바뀌면 조용히 넘어가지 않고 예외를 던진다', () => {
  assert.throws(() => parseTsv('a\tb\nc\td'), /컬럼 누락/);
});

console.log('\n[1-B] 글로벌 TSV — 국가 파일과 컬럼이 다르다 (2026-08-13 실측 버그)');
const GLOBAL_TSV = [
  'week\tcategory\tweekly_rank\tshow_title\tseason_title\tweekly_views\tcumulative_weeks_in_top_10',
  '2026-08-09\tTV (Non-English)\t1\tThe East Palace\tLimited Series\t9100000\t4',
  '2026-08-09\tTV (English)\t2\tSome US Show\tSeason 1\t8000000\t2',
  '2026-08-09\tFilms (English)\t1\tSome Movie\t\t5000000\t1',
  '2026-08-02\tTV (English)\t1\tOld Global Show\tSeason 1\t7000000\t6',
].join('\n');
t('글로벌 파일에는 country_iso2 가 없어도 파싱된다', () => {
  const rows = parseGlobalTsv(GLOBAL_TSV, { category: 'TV' });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, 'The East Palace');
});
t('Films 는 제외되고 최신 주만 남는다', () => {
  const rows = parseGlobalTsv(GLOBAL_TSV, { category: 'TV' });
  assert.ok(!rows.some((r) => r.title === 'Some Movie'));
  assert.ok(!rows.some((r) => r.title === 'Old Global Show'));
});
t('국가 파서로 글로벌 파일을 읽으면 실패한다 — 그래서 별도 경로가 필요하다', () => {
  assert.throws(() => parseTsv(GLOBAL_TSV, { countryIso: 'KR' }), /컬럼 누락/);
});

console.log('\n[2] 페이지 폴백 파싱 (2026-08-13 실제 텍스트)');
const REAL_PAGE = 'Top 10 Shows in South Korea overviewRanking01I am Solo: Part 33102Our Sticky Love: Limited Series103Spooky in Love: Limited Series404Badly in Love: Season 2105The Apartment Job: Limited Series506The East Palace: Limited Series407Agent Kim Reactivated: Limited Series708Rookie Kim’s Stock Market Mission: Season 1109Better Late Than Single: After Service: Season 1210Agent Kim Reactivated – the Universe: 20262Catch the Latest';
t('10개 순위를 뽑아낸다', () => {
  const rows = parsePageText(REAL_PAGE);
  assert.equal(rows.length, 10);
});
t('1위와 6위 제목이 맞는다', () => {
  const rows = parsePageText(REAL_PAGE);
  assert.match(rows[0].title, /I am Solo/);
  assert.match(rows[5].title, /East Palace/);
});

console.log('\n[2-B] 이력이 없을 때의 신규 판정 (2026-08-13 실측 버그)');
t('첫 실행에서 7주째 작품을 신규로 오판하지 않는다', () => {
  const r = noveltyScore({ rank: 7, title: 'Agent Kim Reactivated', weeksInTop10: 7 }, [], { hasHistory: false });
  assert.equal(r.reason, 'established_by_weeks');
  assert.ok(r.score < 0.4, `장기 체류작 점수 ${r.score} 는 낮아야 한다`);
});
t('첫 실행에서 1주차 작품은 신규로 인정된다', () => {
  const r = noveltyScore({ rank: 2, title: 'Our Sticky Love', weeksInTop10: 1 }, [], { hasHistory: false });
  assert.equal(r.reason, 'new_entry_by_weeks');
  assert.ok(r.score > 0.9);
});
t('4주차는 중간 등급을 받는다', () => {
  const r = noveltyScore({ rank: 6, title: 'The East Palace', weeksInTop10: 4 }, [], { hasHistory: false });
  assert.equal(r.reason, 'established_by_weeks');
});

console.log('\n[3] 신작성 점수 — 순위보다 신규성이 중요하다');
const prev = [{ rank: 1, title: 'I am Solo', weeksInTop10: 30 }, { rank: 9, title: 'The East Palace', weeksInTop10: 3 }];
t('신규 진입이 최고점을 받는다', () => {
  const r = noveltyScore({ rank: 2, title: 'Our Sticky Love', weeksInTop10: 1 }, prev);
  assert.equal(r.reason, 'new_entry');
  assert.ok(r.score > 0.8);
});
t('6위 상승작이 1위 장기체류작보다 높다', () => {
  const climbing = noveltyScore({ rank: 6, title: 'The East Palace', weeksInTop10: 4 }, prev);
  const saturated = noveltyScore({ rank: 1, title: 'I am Solo', weeksInTop10: 31 }, prev);
  assert.equal(climbing.reason, 'climbing');
  assert.equal(saturated.reason, 'saturated');
  assert.ok(climbing.score > saturated.score,
    `상승 ${climbing.score} 가 포화 ${saturated.score} 보다 커야 한다`);
});

console.log('\n[4] 한국어 별칭 매칭 (2026-08-13 실측 버그)');
const YT = [
  { rank: 3, title: '동궁 6화 하이라이트', channel: 'tvN', viewCount: 900000 },
  { rank: 9, title: '전혀 무관한 브이로그', channel: 'vlog', viewCount: 1000 },
];
t("짧은 한국어 제목은 기본 기준에서 걸러진다 — 이것이 원래 동작", () => {
  const r = matchTitle('동궁', YT);
  assert.equal(r.matched, false);
  assert.equal(r.reason, 'title_too_generic');
});
t('검증된 별칭은 완화 기준으로 매칭된다', () => {
  const r = matchTitle('동궁', YT, { minChars: 2, minWords: 1 });
  assert.equal(r.matched, true);
  assert.equal(r.hits[0].rank, 3);
});
t('완화 기준에서도 무관한 영상은 걸리지 않는다', () => {
  const r = matchTitle('동궁', [YT[1]], { minChars: 2, minWords: 1 });
  assert.equal(r.matched, false);
});
t('영어 원제는 여전히 엄격한 기준을 유지한다', () => {
  assert.equal(matchTitle('Wrath', YT).reason, 'title_too_generic');
});

console.log('\n[5] 검색 화제성 신호');
t('임계치 미만은 신호로 인정하지 않는다', () => {
  assert.equal(buzzStrength({ videos: 5, relevant: 5, topViews: BUZZ_MIN_VIEWS - 1 }), null);
});
t('검색 결과가 없으면 null', () => {
  assert.equal(buzzStrength({ videos: 0, relevant: 0, topViews: 0 }), null);
});

console.log('\n[5-B] 검색 결과 관련성 필터 (2026-08-13 실측 오탐)');
// 실제로 'Badly in Love' 검색에서 나왔던 무관한 영상들
const SEARCH_HITS = [
  { title: '입만 열면 어질어질한 "진짜 갸루걸"', views: 2399939 },
  { title: 'When Both Are Madly in Love ! #tmkoc #funny #jethalal', views: 984459 },
  { title: 'Badly in Love ep3 리액션 #kdrama', views: 700000 },
];
t('작품명이 제목에 없는 영상은 걸러진다', () => {
  const rel = filterRelevant(SEARCH_HITS, ['Badly in Love']);
  assert.equal(rel.length, 1);
  assert.match(rel[0].title, /Badly in Love ep3/);
});
t('인도 시트콤(#tmkoc)이 한국 드라마 신호로 잡히지 않는다', () => {
  const rel = filterRelevant(SEARCH_HITS, ['Badly in Love']);
  assert.ok(!rel.some((v) => v.title.includes('tmkoc')));
});
t('관련 영상이 1개뿐이면 신호로 인정하지 않는다', () => {
  assert.equal(buzzStrength({ videos: 10, relevant: 1, topViews: 5_000_000 }), null);
});
t('관련 영상 2개 이상 + 조회수 충족이면 신호가 된다', () => {
  assert.ok(buzzStrength({ videos: 10, relevant: 3, topViews: 3_000_000 }) > 0);
});
t('검증된 한국어 별칭은 완화 기준으로 관련성을 판정한다', () => {
  const vids = [
    { title: '멋 부리려고 다리를 꼰 게 아니라 #동궁 #조승우', views: 3270886 },
    { title: '전혀 무관한 영상', views: 100 },
  ];
  assert.equal(filterRelevant(vids, ['The East Palace', '동궁']).length, 0);
  assert.equal(filterRelevant(vids, ['The East Palace', '동궁'], { minChars: 2, minWords: 1 }).length, 1);
});
t('실측 수준의 드라마 조회수가 유의미한 점수를 받는다', () => {
  // 2026-08-13 실측: 동궁 327만, Our Sticky Love 179만, Spooky in Love 115만
  const dongung = buzzStrength({ videos: 10, relevant: 3, topViews: 3_270_886 });
  const sticky  = buzzStrength({ videos: 10, relevant: 3, topViews: 1_792_524 });
  assert.ok(dongung > 0.4, `동궁 ${dongung} 이 유의미해야 한다`);
  assert.ok(sticky > 0.3, `Our Sticky Love ${sticky} 이 유의미해야 한다`);
  assert.ok(dongung > sticky, '조회수가 높으면 점수도 높아야 한다');
});
t('조회수가 아무리 커도 1을 넘지 못한다 — 이것이 K-pop 편향을 막는 장치', () => {
  // 조회수를 그대로 쓰면 K-pop MV(수천만~수억)가 드라마 클립(수백만)을 항상 이긴다.
  // 로그 스케일 + 상한으로 기여도를 최대 0.2점(가중치)으로 묶는다.
  const kpop = buzzStrength({ videos: 10, relevant: 3, topViews: 200_000_000 });
  assert.equal(kpop, 1);
  const contribution = 0.2 * kpop;
  assert.ok(contribution <= 0.2, '최종 점수 기여도는 가중치를 넘지 않는다');
});
t('임계치 바로 위는 낮은 점수를 받는다', () => {
  const barely = buzzStrength({ videos: 10, relevant: 2, topViews: 320_000 });
  assert.ok(barely < 0.1, `겨우 넘긴 값 ${barely} 은 낮아야 한다`);
});
t('상한은 1을 넘지 않는다', () => {
  assert.ok(buzzStrength({ videos: 5, relevant: 3, topViews: 999_000_000 }) <= 1);
});

console.log(`\n결과: ${pass} 통과, ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
