/**
 * 수집기 통합 드라이런.
 * 네이버 API 키 없이 파이프라인 전체가 도는지, 부분 실패가 격리되는지 확인한다.
 * 실행: node scripts/__tests__/collect.dryrun.mjs
 */
process.env.NAVER_CLIENT_ID ||= 'dryrun';
process.env.NAVER_CLIENT_SECRET ||= 'dryrun';

const weeks = (n, base, drift = 0) =>
  Array.from({ length: n }, (_, i) => ({
    period: new Date(Date.UTC(2026, 3, 27) + i * 7 * 86400000).toISOString().slice(0, 10),
    ratio: Math.max(1, base + i * drift + (i % 3) * 2),
  }));

// 2번째 배치(성수동 포함)는 재시도해도 계속 실패시켜 '실패 격리'를 검증한다
global.fetch = async (url, init) => {
  const u = String(url);
  const ok = (json) => ({ ok: true, status: 200, json: async () => json, text: async () => JSON.stringify(json) });

  if (u.includes('/datalab/search')) {
    const body = JSON.parse(init.body);
    if (init.body.includes('성수동')) {
      return { ok: false, status: 503, statusText: 'Service Unavailable', text: async () => 'busy' };
    }
    return ok({
      startDate: body.startDate, endDate: body.endDate, timeUnit: 'week',
      results: body.keywordGroups.map((g, i) => ({
        title: g.groupName, keywords: g.keywords,
        // 세 번째 그룹은 검색량 부족 재현
        data: i === 3 ? [] : weeks(16, 50 + i * 5, i === 1 ? 2.5 : 0),
      })),
    });
  }
  if (u.includes('/datalab/shopping/categories')) {
    const body = JSON.parse(init.body);
    return ok({ startDate: body.startDate, endDate: body.endDate, timeUnit: 'week',
      results: body.category.map((c, i) => ({ title: c.name, category: c.param, data: weeks(16, 40 + i * 10, 1.2) })) });
  }
  if (u.includes('/search/news.json')) return ok({ total: 1234, items: [{ pubDate: 'Wed, 12 Aug 2026 09:00:00 +0900' }] });
  throw new Error('unexpected url ' + u);
};

console.log('\n=== 드라이런 시작 (2번째 검색 배치는 의도적으로 503) ===\n');
const { main } = await import('../collect-trends.mjs');
await main();

const { readFile } = await import('node:fs/promises');
const out = JSON.parse(await readFile(new URL('../../data/signals/latest.json', import.meta.url), 'utf8'));

let fail = 0;
const check = (name, cond) => { console.log(cond ? '  ✓' : '  ✗', name); if (!cond) fail++; };

console.log('\n=== 검증 ===');
check('실패한 배치가 errors 에 기록됨', out.errors.some((e) => e.stage === 'search'));
check('실패에도 불구하고 다른 토픽은 수집됨', Object.keys(out.topics).length > 0);
check('쇼핑 신호가 수집됨', Array.isArray(out.shopping) && out.shopping.length === 3);
check('모든 토픽에 evaluation 이 있음', Object.values(out.topics).every((t) => t.evaluation));
check('검색량 부족 토픽은 insufficient_volume 으로 표시됨',
      Object.values(out.topics).some((t) => t.signals.some((s) => s.status === 'insufficient_volume')));
check('단일 신호 토픽이 emerging 을 넘지 않음',
      Object.values(out.topics).every((t) => t.evaluation.independentSources >= 2 || ['emerging', null].includes(t.evaluation.stage)));

if (fail) { console.log(`\n실패 ${fail}건\n`); process.exit(1); }

// ── 회귀 테스트: 자격증명 없음 = 조용한 성공이 아니라 명시적 실패 ──────────
// 2026-08-13 CI 에서 실제로 초록불이 뜬 버그. 다시는 통과하지 않게 고정한다.
{
  console.log('\n=== 회귀: 자격증명 누락 시 실패해야 함 ===');
  const savedId = process.env.NAVER_CLIENT_ID, savedSecret = process.env.NAVER_CLIENT_SECRET;
  delete process.env.NAVER_CLIENT_ID;
  delete process.env.NAVER_CLIENT_SECRET;
  let threw = false;
  try {
    const { main: m2 } = await import('../collect-trends.mjs?nocache=' + Date.now());
    await m2();
  } catch (e) {
    threw = true;
    console.log('  ✓ 예외 발생:', e.message.slice(0, 60));
  }
  process.env.NAVER_CLIENT_ID = savedId;
  process.env.NAVER_CLIENT_SECRET = savedSecret;
  if (!threw) { console.log('  ✗ 자격증명 없이도 성공해버림 — 이것이 원래 버그'); process.exit(1); }
}
console.log('\n전부 통과\n');
process.exit(0);
{
}
