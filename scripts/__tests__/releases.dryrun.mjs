/** 신작 레이더 통합 드라이런 — 2026-08-13 실제 한국 TOP10 데이터 사용 */
process.env.NAVER_CLIENT_ID ||= 'dryrun';
process.env.NAVER_CLIENT_SECRET ||= 'dryrun';

const TSV = [
  'week\tcountry_iso2\tcountry_name\tcategory\tweekly_rank\tshow_title\tseason_title\tcumulative_weeks_in_top_10',
  '2026-08-09\tKR\tSouth Korea\tTV\t1\tI am Solo\tPart 33\t31',
  '2026-08-09\tKR\tSouth Korea\tTV\t2\tOur Sticky Love\tLimited Series\t1',
  '2026-08-09\tKR\tSouth Korea\tTV\t6\tThe East Palace\tLimited Series\t4',
  '2026-08-09\tKR\tSouth Korea\tTV\t7\tAgent Kim Reactivated\tLimited Series\t7',
].join('\n');

global.fetch = async (url) => {
  const u = String(url);
  if (u.includes('all-weeks-countries.tsv')) return { ok: true, status: 200, text: async () => TSV };
  if (u.includes('/search/news.json'))
    return { ok: true, status: 200, json: async () => ({ total: 842, items: [{ pubDate: 'Wed, 12 Aug 2026 09:00:00 +0900' }] }) };
  throw new Error('unexpected ' + u);
};

console.log('\n=== 신작 레이더 드라이런 ===\n');
const { main, locationPotential } = await import('../collect-releases.mjs');
await main();

const { readFile } = await import('node:fs/promises');
const out = JSON.parse(await readFile(new URL('../../data/releases/latest.json', import.meta.url), 'utf8'));

let fail = 0;
const check = (n, c) => { console.log(c ? '  ✓' : '  ✗', n); if (!c) fail++; };

console.log('\n=== 검증 ===');
const top = out.candidates[0];
check('후보가 산출됨', out.candidates.length > 0);
check('사극(The East Palace)이 촬영지 적합도 1.0 을 받음',
      out.candidates.find((c) => c.title.includes('East Palace'))?.locationPotential === 1.0);
check('스튜디오 예능(I am Solo)은 촬영지 적합도가 낮음',
      out.candidates.find((c) => c.title.includes('I am Solo'))?.locationPotential === 0.2);
check('1위 장기체류 예능이 1순위 후보가 아님', !top.title.includes('I am Solo'));
check('신규 진입 또는 사극이 상위에 옴',
      top.novelty === 'new_entry' || top.locationPotential === 1.0);
check('뉴스 신호가 붙음', out.candidates.every((c) => c.news?.total > 0));

console.log('\n=== 최종 순위 ===');
for (const [i, c] of out.candidates.entries())
  console.log(`  ${i + 1}. ${c.title}  (score ${c.score}, ${c.novelty}, 촬영지 ${c.locationPotential})`);

console.log(`\n${fail ? `실패 ${fail}건` : '전부 통과'}\n`);
process.exit(fail ? 1 : 0);
