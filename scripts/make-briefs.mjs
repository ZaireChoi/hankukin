#!/usr/bin/env node
/**
 * 조사 브리프 생성기 — 파이프라인 1단계.
 *
 * 레이더 결과(data/releases/latest.json)를 읽어 상위 후보별로 브리프를 만든다.
 * 기사를 쓰지 않는다. '쓸 수 있는가'를 판정하고, 못 쓰면 왜 못 쓰는지 남긴다.
 *
 * 실행: node scripts/make-briefs.mjs
 * 출력: data/briefs/<날짜>/*.md  +  data/briefs/latest-summary.json
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildBrief, renderBrief, GATE } from './lib/brief.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iso = (d) => d.toISOString().slice(0, 10);
const log = {
  info: (...a) => console.log('[briefs]', ...a),
  warn: (...a) => console.warn('[briefs][warn]', ...a),
  error: (...a) => console.error('[briefs][error]', ...a),
};

const TOP_N = 6;

export async function main() {
  const today = new Date();

  const relPath = path.join(ROOT, 'data', 'releases', 'latest.json');
  if (!existsSync(relPath)) throw new Error('레이더 결과가 없습니다. collect-releases 를 먼저 실행하세요.');
  const rel = JSON.parse(await readFile(relPath, 'utf8'));

  // 확보된 촬영지 정보 (사람이 채우는 파일). 없으면 전부 '근거 없음' 으로 판정된다.
  let known = {};
  const locPath = path.join(ROOT, 'data', 'locations.json');
  if (existsSync(locPath)) {
    try { known = JSON.parse(await readFile(locPath, 'utf8')).works ?? {}; }
    catch (e) { log.warn(`locations.json 파싱 실패: ${e.message}`); }
  } else {
    log.warn('data/locations.json 이 없습니다 — 모든 후보가 "촬영지 근거 없음" 으로 판정됩니다.');
  }

  const candidates = (rel.candidates ?? []).slice(0, TOP_N);
  if (candidates.length === 0) throw new Error('후보가 없습니다.');

  const outDir = path.join(ROOT, 'data', 'briefs', iso(today));
  await mkdir(outDir, { recursive: true });

  const briefs = [];
  for (const c of candidates) {
    const b = buildBrief(c, known);
    briefs.push(b);
    await writeFile(path.join(outDir, `${b.slug}.md`), renderBrief(b), 'utf8');
  }

  const summary = {
    generatedAt: today.toISOString(),
    radarCollectedAt: rel.collectedAt,
    counts: {
      total: briefs.length,
      ready: briefs.filter((b) => b.gate === GATE.READY).length,
      needsLocation: briefs.filter((b) => b.gate === GATE.NEEDS_LOCATION).length,
      needsSignal: briefs.filter((b) => b.gate === GATE.NEEDS_SIGNAL).length,
      skip: briefs.filter((b) => b.gate === GATE.SKIP).length,
    },
    briefs: briefs.map((b) => ({
      title: b.title, slug: b.slug, gate: b.gate, reason: b.reason,
      radarScore: b.radarScore, independentSources: b.checks.independentSources,
      locationPotential: b.checks.locationPotential,
    })),
  };
  await writeFile(path.join(ROOT, 'data', 'briefs', 'latest-summary.json'),
                  JSON.stringify(summary, null, 2), 'utf8');

  console.table(briefs.map((b) => ({
    title: b.title.slice(0, 30),
    gate: b.gate,
    score: b.radarScore,
    signals: b.checks.independentSources,
    location: b.checks.locationPotential,
  })));

  const { ready, needsLocation, needsSignal, skip } = summary.counts;
  log.info(`브리프 ${briefs.length}건 — 초안가능 ${ready} / 촬영지필요 ${needsLocation} / 신호부족 ${needsSignal} / 제외 ${skip}`);
  log.info(`저장: ${outDir}`);

  if (ready === 0) {
    log.warn('초안 생성 가능한 후보가 0건입니다. data/locations.json 에 촬영지 출처를 채워야 다음 단계로 갑니다.');
    log.warn('이것은 오류가 아니라 설계된 동작입니다 — 근거 없이 기사를 만들지 않습니다.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { log.error(e.message); process.exit(1); });
}
