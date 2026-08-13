#!/usr/bin/env node
/**
 * Korea Now — 트렌드 신호 수집기
 *
 * 이 스크립트는 "발행"하지 않는다. 오직 신호를 쌓는다.
 * 트렌드 판정에는 최소 4주치 완료 구간이 필요하고, 데이터는 소급해서 만들 수 없다.
 * 그래서 사이트가 완성되기 전에 먼저 돌기 시작해야 한다.
 *
 * 실행:  node scripts/collect-trends.mjs
 * 필요:  NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 * 출력:  data/signals/YYYY-MM-DD.json  (원본 + 정규화 결과)
 *        data/signals/latest.json      (최신 스냅샷)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { searchTrend, shoppingCategoryTrend, newsCount, assertCredentials, TOPICS_PER_REQUEST } from './lib/datalab.mjs';
import { normalizeAgainstAnchor, momentum, evaluateStage, dropIncompletePeriod, SIGNAL_STATUS } from './lib/normalize.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'data', 'signals');
const LOOKBACK_DAYS = 180;   // 모멘텀 계산에 충분한 창

const iso = (d) => d.toISOString().slice(0, 10);
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

const log = {
  info: (...a) => console.log('[collect]', ...a),
  warn: (...a) => console.warn('[collect][warn]', ...a),
  error: (...a) => console.error('[collect][error]', ...a),
};

export async function main() {
  // 배치 try/catch 가 인증 오류를 삼켜 '조용한 성공'이 되는 것을 막는다.
  assertCredentials();

  const today = new Date();
  const start = iso(new Date(today.getTime() - LOOKBACK_DAYS * 86400000));
  const end = iso(today);
  const watchlist = JSON.parse(await readFile(path.join(ROOT, 'data', 'watchlist.json'), 'utf8'));
  const anchor = watchlist.anchor;

  const collected = { collectedAt: today.toISOString(), window: { start, end, timeUnit: 'week' }, topics: {}, errors: [] };

  // ── 1. 검색 신호 ─────────────────────────────────────────────
  // 실패 격리: 배치 하나가 죽어도 나머지는 계속한다.
  for (const batch of chunk(watchlist.searchTopics, TOPICS_PER_REQUEST)) {
    const groups = [
      { groupName: anchor.name, keywords: anchor.keywords },
      ...batch.map((t) => ({ groupName: t.name, keywords: t.keywords })),
    ];
    try {
      const res = await searchTrend({ startDate: start, endDate: end, timeUnit: 'week', keywordGroups: groups }, { log });
      for (const n of normalizeAgainstAnchor(res.results, anchor.name, 'week', today)) {
        const meta = batch.find((t) => t.name === n.topic);
        const id = meta?.id ?? n.topic;
        collected.topics[id] ??= { id, name: n.topic, category: meta?.category ?? null, signals: [] };
        collected.topics[id].signals.push({
          source: 'search',
          status: n.status,
          weeksObserved: n.points.length,
          momentum: n.status === SIGNAL_STATUS.OK ? momentum(n.points) : null,
          points: n.points,
        });
      }
      log.info(`검색 신호 ${batch.length}건 수집`);
    } catch (e) {
      log.error('검색 배치 실패:', e.message);
      collected.errors.push({ stage: 'search', topics: batch.map((t) => t.id), message: e.message });
    }
    await new Promise((r) => setTimeout(r, 400));   // 속도제한
  }

  // ── 2. 쇼핑 신호 (두 번째 독립 소스) ──────────────────────────
  try {
    const res = await shoppingCategoryTrend({
      startDate: start, endDate: end, timeUnit: 'week',
      category: watchlist.shoppingCategories.map((c) => ({ name: c.name, param: [c.code] })),
    }, { log });

    collected.shopping = res.results.map((r) => {
      const pts = dropIncompletePeriod(r.data, 'week', today);
      return {
        name: r.title,
        weeksObserved: pts.length,
        momentum: momentum(pts.map((p) => ({ raw: p.ratio, vsAnchor: null }))),
        points: pts,
      };
    });

    // 카테고리 모멘텀을 해당 카테고리 토픽의 두 번째 신호로 부여한다.
    // 주의: 이것은 개별 상품이 아니라 '카테고리 전체'의 움직임이다. 약한 신호로 취급한다.
    const byCat = { beauty: '화장품/미용', food: '식품', fashion: '패션의류' };
    for (const t of Object.values(collected.topics)) {
      const catName = byCat[t.category];
      const s = collected.shopping.find((x) => x.name === catName);
      if (s && s.momentum != null) {
        t.signals.push({ source: 'shopping', status: SIGNAL_STATUS.OK, scope: 'category',
                         weeksObserved: s.weeksObserved, momentum: s.momentum });
      }
    }
    log.info(`쇼핑 카테고리 ${collected.shopping.length}건 수집`);
  } catch (e) {
    log.error('쇼핑 신호 실패:', e.message);
    collected.errors.push({ stage: 'shopping', message: e.message });
  }

  // ── 3. 언론 노출 (세 번째 신호, 보조) ─────────────────────────
  for (const t of Object.values(collected.topics)) {
    try {
      const n = await newsCount(t.name, { log });
      if (n) t.news = n;
    } catch (e) {
      log.warn(`뉴스 조회 실패 ${t.name}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  // ── 4. 단계 판정 (저장만 하고 발행하지 않는다) ────────────────
  for (const t of Object.values(collected.topics)) {
    t.evaluation = evaluateStage({
      signals: t.signals,
      weeksObserved: Math.max(0, ...t.signals.map((s) => s.weeksObserved ?? 0)),
    });
  }

  // ── 5. 수집 실패 판정 ────────────────────────────────────────
  // 사용 가능한 신호가 하나도 없으면 '성공'이 아니다.
  // 빈 파일을 커밋하면 데이터가 쌓이는 것처럼 보여서 더 위험하다 — 아예 쓰지 않는다.
  const usableSignals = Object.values(collected.topics).reduce(
    (n, t) => n + t.signals.filter((s) => s.status === SIGNAL_STATUS.OK && s.momentum != null).length, 0);

  if (usableSignals === 0) {
    log.error('사용 가능한 신호가 0건입니다. 파일을 쓰지 않고 실패로 종료합니다.');
    for (const e of collected.errors) log.error(` - ${e.stage}: ${e.message}`);
    throw new Error(`수집 실패: 사용 가능한 신호 0건 (오류 ${collected.errors.length}건)`);
  }

  // 절반 이상 실패했으면 성공으로 치되 크게 경고한다.
  const topicCount = Object.keys(collected.topics).length;
  if (collected.errors.length > 0 && usableSignals < topicCount) {
    log.warn(`부분 수집: 사용 가능한 신호 ${usableSignals}건 / 토픽 ${topicCount}개`);
  }

  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${iso(today)}.json`);
  await writeFile(file, JSON.stringify(collected, null, 2), 'utf8');
  await writeFile(path.join(OUT_DIR, 'latest.json'), JSON.stringify(collected, null, 2), 'utf8');

  // ── 요약 ────────────────────────────────────────────────────
  const rows = Object.values(collected.topics).map((t) => ({
    topic: t.name,
    stage: t.evaluation.stage ?? '-',
    sources: t.evaluation.independentSources,
    momentum: t.evaluation.avgMomentum != null ? `${(t.evaluation.avgMomentum * 100).toFixed(1)}%` : '-',
    reason: t.evaluation.reason,
  }));
  console.table(rows);
  log.info(`저장: ${file}`);
  if (collected.errors.length) log.warn(`부분 실패 ${collected.errors.length}건 — 나머지는 정상 저장됨`);
}

// 직접 실행할 때만 구동한다. 테스트에서는 main() 을 import 해 await 한다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { log.error(e); process.exit(1); });
}
