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

console.log(`\n결과: ${pass} 통과, ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
