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
import { newsCount } from './lib/datalab.mjs';
import { fetchMostPopular, matchTitle, trendingStrength, CATEGORY } from './lib/youtube.mjs';

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
    { key: 'korea',  country: 'south-korea', iso: 'KR', scope: 'country', label: '한국' },
    { key: 'global', country: 'global',      iso: '',   scope: 'global',  label: '글로벌' },
  ];

  for (const t of targets) {
    const res = await fetchTop10({ country: t.country, iso: t.iso || 'KR', scope: t.scope, kind: 'tv', log });
    if (!res) { out.errors.push({ stage: `netflix:${t.key}`, message: '수집 실패' }); continue; }
    out.charts[t.key] = res.rows;
    out.sourceMode ??= res.source;
    log.info(`${t.label} TOP10 ${res.rows.length}건 (${res.source})`);
  }

  if (Object.keys(out.charts).length === 0) {
    throw new Error('차트를 하나도 수집하지 못했습니다. 신작 레이더 실패.');
  }

  // ── 후보 산출 ────────────────────────────────────────────────
  const hasHistory = Object.values(previous).some((v) => Array.isArray(v) && v.length > 0);
  if (!hasHistory) log.warn('이전 스냅샷이 없습니다 — 신규 판정은 누적 주차를 근거로 대체합니다.');

  const seen = new Map();
  for (const [key, rows] of Object.entries(out.charts)) {
    for (const row of rows) {
      const novelty = noveltyScore(row, previous[key] ?? [], { hasHistory });
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

  // ── YouTube 교차 검증 (두 번째 독립 신호) ─────────────────────
  // Netflix 순위 = 실제 시청 / YouTube 트렌딩 = 화제성.
  // 성격이 다르므로 같은 작품을 함께 가리키면 독립 신호 2개로 인정한다.
  const ytBuckets = [];
  for (const cat of [null, CATEGORY.ENTERTAINMENT, CATEGORY.MUSIC]) {
    const r = await fetchMostPopular({ regionCode: 'KR', categoryId: cat, log });
    if (r) ytBuckets.push(...r.items);
    await new Promise((r2) => setTimeout(r2, 200));
  }
  out.youtubeVideosScanned = ytBuckets.length;

  if (ytBuckets.length === 0) {
    log.warn('YouTube 신호를 가져오지 못했습니다 — Netflix 단일 신호로만 진행합니다.');
    out.errors.push({ stage: 'youtube', message: '인기영상 수집 실패' });
  }

  // Netflix 는 영어 제목, 한국 YouTube 트렌딩은 한국어 제목을 쓴다.
  // 별칭이 없으면 매칭이 구조적으로 실패한다 (2026-08-13 첫 실행에서 10건 중 0건).
  // 검증된 별칭만 사용한다. 추정 별칭은 없는 신호를 만들 수 있으므로 매칭에서 제외한다.
  const aliases = {};
  let unverifiedCount = 0;
  try {
    const raw = JSON.parse(await readFile(path.join(ROOT, 'data', 'title-aliases.json'), 'utf8'));
    for (const e of raw.entries ?? []) {
      if (e.verified) aliases[e.title] = e.aliases;
      else unverifiedCount++;
    }
    log.info(`별칭 ${Object.keys(aliases).length}건 사용 (미검증 ${unverifiedCount}건은 제외)`);
  } catch { log.warn('title-aliases.json 없음 — 영어 제목으로만 매칭합니다.'); }
  out.aliasesUsed = Object.keys(aliases).length;
  out.aliasesUnverified = unverifiedCount;

  for (const c of seen.values()) {
    const names = [c.title, ...(aliases[c.title] ?? [])];
    let m = { matched: false, reason: 'no_match', hits: [] };
    for (const n of names) {
      const r = matchTitle(n, ytBuckets);
      if (r.matched) { m = r; break; }
      if (r.reason === 'title_too_generic' && m.reason === 'no_match') m.reason = r.reason;
    }
    c.youtube = { matched: m.matched, reason: m.reason, hits: m.hits, triedAliases: names.length - 1 };
    if (m.matched) {
      c.youtube.strength = trendingStrength(m.hits);
      c.independentSources = 2;                 // Netflix + YouTube
      c.score = Number(Math.min(1, c.score + 0.2 * (c.youtube.strength ?? 0.5)).toFixed(3));
    } else {
      c.independentSources = 1;
    }
  }

  // ── 뉴스 신호 (보조, 네이버 승인 시 활성) ─────────────────────
  for (const c of seen.values()) {
    try {
      const n = await newsCount(c.title, { log });
      if (n) c.news = n;
    } catch (e) { log.warn(`뉴스 조회 생략 ${c.title}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 200));
  }

  out.candidates = [...seen.values()].sort((a, b) => b.score - a.score);

  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, `${iso(today)}.json`), JSON.stringify(out, null, 2), 'utf8');
  await writeFile(latestPath, JSON.stringify(out, null, 2), 'utf8');

  console.table(out.candidates.slice(0, 10).map((c) => ({
    title: c.title.slice(0, 30),
    score: c.score,
    novelty: c.novelty,
    location: c.locationPotential,
    youtube: c.youtube?.matched ? `✓ ${c.youtube.strength}` : '-',
    sources: c.independentSources,
  })));
  const corroborated = out.candidates.filter((c) => c.independentSources >= 2);
  log.info(`독립 신호 2개 이상 확보: ${corroborated.length}건 / 전체 ${out.candidates.length}건`);
  log.info(`후보 ${out.candidates.length}건 저장`);
  if (out.sourceMode === 'page') {
    log.warn('페이지 폴백으로 수집했습니다 — 구조 변경에 취약하니 결과를 한 번 눈으로 확인하세요.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { log.error(e.message); process.exit(1); });
}
