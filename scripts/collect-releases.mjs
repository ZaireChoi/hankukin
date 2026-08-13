#!/usr/bin/env node
/**
 * 신작 레이더 — 드라마·K-pop 축의 시의성 신호 수집.
 *
 * 왜 별도 스크립트인가:
 *  collect-trends.mjs 는 음식·뷰티·패션(Korea Now)을 본다. 그건 콘텐츠의 30% 축이다.
 *  정작 50% 를 차지하는 드라마·스타 축(문서 02 §5)에는 시의성 입력이 없었다.
 *  문서 07 §6-1 은 "신작·컴백 직후 신속 발행"을 수익 1순위 원칙으로 두고,
 *  04 §4 의 주제 점수는 '현재 검색·트렌드 수요'에 최대 배점 25점을 준다.
 *  이 스크립트가 그 25점을 채우는 데이터를 만든다.
 *
 * 출력은 '무엇을 쓸지' 후보 목록이지 기사가 아니다. 발행은 하지 않는다.
 *
 * 실행: node scripts/collect-releases.mjs
 * 필요: NAVER_CLIENT_ID / NAVER_CLIENT_SECRET (뉴스 신호용)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fetchTop10, noveltyScore } from './lib/netflix.mjs';
import { newsCount, assertCredentials } from './lib/datalab.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'data', 'releases');
const iso = (d) => d.toISOString().slice(0, 10);

const log = {
  info: (...a) => console.log('[releases]', ...a),
  warn: (...a) => console.warn('[releases][warn]', ...a),
  error: (...a) => console.error('[releases][error]', ...a),
};

/**
 * 촬영지 콘텐츠 적합도.
 * 우리가 팔 수 있는 것은 '가볼 수 있는 장소'다. 스튜디오 예능은 순위가 높아도 쓸 게 없다.
 * 반대로 사극·시대극은 고궁·한옥마을이 곧 촬영지라 Scenes 와 문화·역사 축에 동시에 걸린다.
 */
export function locationPotential(title) {
  const t = title.toLowerCase();
  const studioish = /(i am solo|single|dating|survival|quiz|talk|stand-?up|reaction|comedy special)/;
  const periodish = /(palace|dynasty|joseon|king|queen|royal|court|sword|hanbok|東宮|궁)/;
  if (periodish.test(t)) return { score: 1.0, note: '사극·궁궐 — 고궁/한옥 촬영지, 문화·역사 축과 중첩' };
  if (studioish.test(t)) return { score: 0.2, note: '스튜디오 중심 — 방문 가능한 촬영지가 적을 가능성' };
  return { score: 0.6, note: '일반 드라마 — 촬영지 확인 필요' };
}

export async function main() {
  assertCredentials();
  const today = new Date();

  // 이전 스냅샷 (신규 진입·순위 상승 판정용)
  let previous = { korea: [], global: [] };
  const latestPath = path.join(OUT_DIR, 'latest.json');
  if (existsSync(latestPath)) {
    try { previous = JSON.parse(await readFile(latestPath, 'utf8')).charts ?? previous; }
    catch { log.warn('이전 스냅샷을 읽지 못했습니다 — 전부 신규로 간주됩니다'); }
  }

  const out = { collectedAt: today.toISOString(), charts: {}, candidates: [], errors: [] };

  // ── 차트 수집 ────────────────────────────────────────────────
  // 한국 = 진짜 한국에서 뜨는 것(진정성), 글로벌 = 우리 독자가 보는 것(수요).
  const targets = [
    { key: 'korea',  country: 'south-korea', iso: 'KR', label: '한국' },
    { key: 'global', country: 'global',      iso: '',   label: '글로벌' },
  ];

  for (const t of targets) {
    const res = await fetchTop10({ country: t.country, iso: t.iso || 'KR', kind: 'tv', log });
    if (!res) { out.errors.push({ stage: `netflix:${t.key}`, message: '수집 실패' }); continue; }
    out.charts[t.key] = res.rows;
    out.sourceMode ??= res.source;
    log.info(`${t.label} TOP10 ${res.rows.length}건 (${res.source})`);
  }

  if (Object.keys(out.charts).length === 0) {
    throw new Error('차트를 하나도 수집하지 못했습니다. 신작 레이더 실패.');
  }

  // ── 후보 산출 ────────────────────────────────────────────────
  const seen = new Map();
  for (const [key, rows] of Object.entries(out.charts)) {
    for (const row of rows) {
      const novelty = noveltyScore(row, previous[key] ?? []);
      const loc = locationPotential(row.title);
      const prior = seen.get(row.title);
      // 한국·글로벌 양쪽에 모두 오르면 가장 강한 기회다
      const bothCharts = Boolean(prior);
      const score = Number((
        novelty.score * 0.5 + loc.score * 0.35 + (bothCharts ? 0.15 : 0)
      ).toFixed(3));

      if (prior) {
        prior.score = Math.max(prior.score, score);
        prior.charts.push(key);
        prior.bothCharts = true;
      } else {
        seen.set(row.title, {
          title: row.title, season: row.season ?? '',
          charts: [key], bothCharts: false,
          rank: row.rank, weeksInTop10: row.weeksInTop10,
          novelty: novelty.reason, noveltyScore: novelty.score,
          locationPotential: loc.score, locationNote: loc.note,
          score,
        });
      }
    }
  }

  // ── 뉴스 신호 (보조) ─────────────────────────────────────────
  for (const c of seen.values()) {
    try {
      const n = await newsCount(c.title, { log });
      if (n) c.news = n;
    } catch (e) { log.warn(`뉴스 조회 실패 ${c.title}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 200));
  }

  out.candidates = [...seen.values()].sort((a, b) => b.score - a.score);

  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, `${iso(today)}.json`), JSON.stringify(out, null, 2), 'utf8');
  await writeFile(latestPath, JSON.stringify(out, null, 2), 'utf8');

  console.table(out.candidates.slice(0, 10).map((c) => ({
    title: c.title.slice(0, 34),
    score: c.score,
    novelty: c.novelty,
    location: c.locationPotential,
    charts: c.charts.join('+'),
  })));
  log.info(`후보 ${out.candidates.length}건 저장`);
  if (out.sourceMode === 'page') {
    log.warn('페이지 폴백으로 수집했습니다 — 구조 변경에 취약하니 결과를 한 번 눈으로 확인하세요.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { log.error(e.message); process.exit(1); });
}
