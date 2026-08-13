#!/usr/bin/env node
/**
 * 촬영지 자동 발굴 — 한국관광공사 데이터가 스스로 말하는 촬영지를 찾는다.
 *
 * 왜 만들었나 (2026-08-13, 운영자 지적):
 *   "작품명과 장소 이름도 조사해서 적어야 하는 것 아니냐."
 *   맞다. 사람이 기억으로 장소를 적으면, 우리가 반려한 블로거의 목격담과
 *   근거의 등급이 같아진다. 그래서 데이터가 대게 한다.
 *
 * 하는 일:
 *   1. 촬영지 관련 키워드로 TourAPI 를 훑는다
 *   2. 각 장소의 공식 소개글을 읽는다
 *   3. 소개글에 촬영 언급이 있고, 작품명이 명시된 곳만 남긴다
 *   4. '작품 → 장소' 색인을 data/filming-index.json 에 쓴다
 *
 * 하지 않는 일:
 *   발행 승인을 하지 않는다. 여기 나온 것은 후보이며, 게이트는 그대로 작동한다.
 *
 * 쿼터:
 *   상세조회가 장소당 1회다. MAX_DETAIL 로 제한하고, 이미 훑은 contentId 는
 *   건너뛴다. 여러 번 나눠 돌리면 색인이 누적된다.
 *
 * 실행: node scripts/discover-locations.mjs
 *       MAX_DETAIL=300 node scripts/discover-locations.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  assertTourApiKey, searchPlace, fetchOverview,
  extractWorkTitles, mentionsFilming, regionOf,
} from './lib/tourapi.mjs';
import {
  SWEEP_KEYWORDS, KPOP_SWEEP_KEYWORDS, toFinding, mergeFindings,
  indexByWork, indexByArtist, summarize, isVisitableType,
} from './lib/discover.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'filming-index.json');
const ROWS_PER_PAGE = 100;
const PAGES_PER_KEYWORD = Number(process.env.PAGES_PER_KEYWORD ?? 3);
const MAX_DETAIL = Number(process.env.MAX_DETAIL ?? 200);
const RESCAN = process.env.RESCAN === '1';

const log = {
  info: (...a) => console.log('[discover]', ...a),
  warn: (...a) => console.warn('[discover][warn]', ...a),
  error: (...a) => console.error('[discover][error]', ...a),
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadPrevious() {
  try {
    const doc = JSON.parse(await readFile(OUT, 'utf8'));
    return Array.isArray(doc.findings) ? doc.findings : [];
  } catch { return []; }
}

export async function main() {
  assertTourApiKey();
  const previous = await loadPrevious();
  const known = new Set(previous.map((f) => String(f.contentId)));
  log.info(`이전 색인 ${previous.length}건 — 이미 훑은 곳은 건너뜁니다.`);

  // ── 1. 후보 수집 (검색 단계) ────────────────────────────────
  const candidates = new Map();
  const kindOf = new Map();          // contentId → 'drama' | 'kpop' (어느 훑기에서 나왔는가)
  let searchCalls = 0, seenTotal = 0, droppedByType = 0;
  const sweeps = [
    ...SWEEP_KEYWORDS.map((k) => ({ keyword: k, kind: 'drama' })),
    ...KPOP_SWEEP_KEYWORDS.map((k) => ({ keyword: k, kind: 'kpop' })),
  ];
  // 접속 자체가 안 되는 상황에서 22개 키워드를 다 돌면 7분을 버린다.
  // 2026-08-13 2회차가 그랬다 — 'fetch failed' 가 전부였는데 6분 47초를 갈았다.
  // 연속 실패가 임계치를 넘으면 즉시 멈춘다. 빨리 실패하는 편이 낫다.
  const ABORT_AFTER_CONSECUTIVE_FAILURES = 3;
  let consecutiveFailures = 0;

  for (const { keyword, kind } of sweeps) {
    const before = candidates.size;
    for (let page = 1; page <= PAGES_PER_KEYWORD; page++) {
      const items = await searchPlace(keyword, { rows: ROWS_PER_PAGE, page, log });
      searchCalls++;
      if (items === null) {
        log.warn(`검색 실패: ${keyword} p${page}`);
        if (++consecutiveFailures >= ABORT_AFTER_CONSECUTIVE_FAILURES) {
          throw new Error(
            `연속 ${consecutiveFailures}회 검색 실패 — TourAPI 에 접속할 수 없습니다.\n` +
            `  1회차는 같은 키로 성공했으므로 인증 문제가 아닐 가능성이 높습니다.\n` +
            `  공공데이터포털(data.go.kr) 점검·장애를 확인하고 나중에 다시 실행하세요.`);
        }
        break;
      }
      consecutiveFailures = 0;
      if (items.length === 0) break;
      for (const it of items) {
        seenTotal++;
        // 어디서 줄어드는지 보이게 한다 — 조용히 0건이 되는 것이 가장 나쁘다
        if (!isVisitableType(it.contentTypeId)) { droppedByType++; continue; }
        const id = String(it.contentId);
        if (!candidates.has(id)) { candidates.set(id, it); kindOf.set(id, kind); }
      }
      if (items.length < ROWS_PER_PAGE) break;
      await sleep(200);
    }
    log.info(`[${kind}] "${keyword}" → 신규 ${candidates.size - before}곳 (누적 ${candidates.size})`);
  }
  log.info(`검색 결과 총 ${seenTotal}건 · 유형 제외 ${droppedByType}건 · 방문가능 후보 ${candidates.size}곳`);

  if (candidates.size === 0) {
    throw new Error('후보를 한 곳도 찾지 못했습니다. 인증키 또는 API 상태를 확인하세요.');
  }

  // ── 2. 소개글 조회 (상세 단계) ──────────────────────────────
  // 추출 로직이 바뀌면 이미 훑은 곳도 다시 읽어야 한다.
  // 로직만 고치고 옛 결과를 그대로 두면, 고친 줄 알고 넘어가게 된다.
  const fresh = RESCAN
    ? [...candidates.values()]
    : [...candidates.values()].filter((it) => !known.has(String(it.contentId)));
  if (RESCAN) log.info('RESCAN=1 — 이전에 훑은 곳도 다시 읽습니다.');
  const targets = fresh.slice(0, MAX_DETAIL);
  log.info(`신규 ${fresh.length}곳 중 이번 회차 ${targets.length}곳을 조회합니다 (한도 ${MAX_DETAIL}).`);

  const next = [];
  let detailFailures = 0;
  for (const [i, it] of targets.entries()) {
    const overview = await fetchOverview(it.contentId, { log });
    if (overview == null) detailFailures++;
    next.push(toFinding(it, overview, { extractWorkTitles, mentionsFilming, regionOf },
                        { kind: kindOf.get(String(it.contentId)) ?? 'drama' }));
    if ((i + 1) % 25 === 0) log.info(`  ${i + 1}/${targets.length} …`);
    await sleep(150);
  }

  // 전부 실패했다면 조용히 성공하지 않는다 — 오늘 배운 원칙
  if (targets.length > 0 && detailFailures === targets.length) {
    throw new Error(`상세조회 ${targets.length}건이 모두 실패했습니다. 쿼터 초과 또는 키 문제로 보입니다.`);
  }

  // ── 3. 저장 ────────────────────────────────────────────────
  const findings = mergeFindings(previous, next);
  const byWork = indexByWork(findings);
  const { byArtist, unnamed } = indexByArtist(findings);
  const stats = summarize(findings);

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({
    _comment: [
      '한국관광공사 데이터에서 자동 발굴한 촬영지 후보. 사람이 기억으로 적은 것이 아니다.',
      '작품명은 공식 소개글이 명시한 것만 담는다 (extractWorkTitles).',
      '',
      '이것은 후보 목록이며 발행 승인이 아니다.',
      'locations.json 으로 옮길 때 운영자가 작품 동일성을 확인해야 한다 —',
      '동명 작품, 리메이크, 원작·영화 구분은 데이터가 대신 판단해 주지 않는다.',
      '',
      '출처 표기: 한국관광공사 (공공누리 제1유형)',
    ],
    generatedAt: new Date().toISOString(),
    stats,
    byWork,
    kpop: { byArtist, unnamed },
    findings,
  }, null, 2) + '\n', 'utf8');

  // ── 4. 요약 출력 ───────────────────────────────────────────
  console.log('\n──────── 발굴 결과 ────────');
  console.log(`검색 호출 ${searchCalls}회 · 상세 조회 ${targets.length}회 (실패 ${detailFailures})`);
  console.log(`누적 조사 ${stats.scanned}곳 · 촬영 언급 ${stats.filmingMentioned}곳 · 작품명 확인 ${stats.workIdentified}곳`);
  console.log(`상류(한국관광공사) 데이터에서 작품명이 이미 지워진 곳 ${stats.upstreamRedacted}곳 — 추측하지 않고 표시만 함`);
  console.log(`확인된 작품 ${stats.works}편\n`);
  for (const w of stats.top) console.log(`  ${String(w.places).padStart(3)}곳  ${w.title}`);

  console.log(`\n──── K-pop 성지 ${stats.kpopPlaces}곳 · 아티스트 ${stats.kpopArtists}명 · 아티스트 미상 ${stats.kpopUnnamed}곳 ────`);
  for (const [name, places] of Object.entries(byArtist).slice(0, 15)) {
    console.log(`  ${String(places.length).padStart(3)}곳  ${name}`);
  }
  for (const p of unnamed.slice(0, 10)) console.log(`    ·  ${p.name} (${p.region ?? '지역미상'})`);

  console.log('\n색인:', path.relative(ROOT, OUT));
  return stats;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { log.error(e.message); process.exit(1); });
}
