#!/usr/bin/env node
/**
 * 이미지 수집 — 한국관광공사 이미지를 저작권 확인 후 저장소로 가져온다.
 *
 * 왜 이 경로인가 (2026-08-13, 운영자 결정):
 *   포토코리아 사진이 더 예쁘지만 다운로드에 로그인이 걸린다.
 *   "사진 올릴 때마다 내가 로그인을 해 줄 수는 없다" — 맞는 말이다.
 *   사람이 매번 개입해야 하는 것은 파이프라인이 아니다.
 *   TourAPI 는 로그인이 없다. 화질을 조금 포기하고 자동화를 얻는다.
 *
 * 안전장치:
 *   ① 저작권 유형을 API 응답(cpyrhtDivCd)에서 읽는다. 통념으로 판단하지 않는다.
 *      유형1·3 만 통과. 그 외·누락은 버린다. 4유형은 상업적 이용이 불가하다.
 *   ② 유형3(변경금지)은 리사이즈하지 않고 원본 그대로 저장한다.
 *      "웹용으로 줄이는 것"도 변경이다.
 *   ③ 전부 실패하면 throw 한다. 빈 결과를 조용히 커밋하지 않는다.
 *
 * 실행: node scripts/fetch-images.mjs
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertTourApiKey, fetchImages } from './lib/tourapi.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/**
 * 2026-08-17: 루트가 아니라 scenes/ 에 저장한다. 이름도 슬러그로 짓는다.
 *
 * 왜 바꿨나 — 같은 사진을 두 벌 받고 있었다.
 *   이 스크립트(GitHub Actions, 매주 월)  src/assets/images/131271-1.jpg
 *   fetch-tourapi-images.ps1 (로컬)        src/assets/images/scenes/jumunjin-breakwater-1.jpg
 * 같은 TourAPI 이미지인데 폴더도 이름도 달랐다. no-duplicate-files 게이트가
 * 13쌍을 잡아 **빌드를 세웠고, 그 상태로는 아무것도 발행되지 않았다.**
 *
 * 이름 규칙을 맞추는 것만으로는 부족하다 — 같은 장소를 다른 이름으로 부르면 또 어긋난다.
 * 그래서 **내용 해시로도 막는다.** 이름이 무엇이든 같은 바이트는 두 번 받지 않는다.
 */
const IMG_DIR = path.join(ROOT, 'src', 'assets', 'images', 'scenes');
const IMG_ROOT = path.join(ROOT, 'src', 'assets', 'images');

/** fetch-tourapi-images.ps1 의 Slug() 와 같은 규칙이어야 한다. 다르면 다시 두 벌이 된다. */
const slugify = (v) => String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** 이미 저장소에 있는 사진의 내용 해시. 이름이 달라도 같은 사진이면 건너뛴다. */
async function loadKnownHashes(dir) {
  const seen = new Map();
  async function walk(d) {
    let entries;
    try { entries = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) { await walk(full); continue; }
      if (!/[.](jpe?g|png|webp)$/i.test(e.name)) continue;
      try {
        const buf = await readFile(full);
        seen.set(createHash('sha256').update(buf).digest('hex'), path.relative(ROOT, full).split(path.sep).join('/'));
      } catch { /* 읽을 수 없는 파일은 없는 것으로 본다 */ }
    }
  }
  await walk(dir);
  return seen;
}
const META = path.join(ROOT, 'data', 'images.json');
const MAX_WIDTH = 1600;          // 반응형 생성은 Astro 가 한다. 원본만 과하지 않게.
const JPEG_QUALITY = 82;

const log = {
  info: (...a) => console.log('[images]', ...a),
  warn: (...a) => console.warn('[images][warn]', ...a),
  error: (...a) => console.error('[images][error]', ...a),
};

/** 저작권 유형 → 스키마의 license 코드 */
function licenseCode(label) {
  if (label.includes('제1유형')) return 'kogl-1';
  if (label.includes('제3유형')) return 'kogl-3';
  return null;
}

async function loadTargets() {
  const doc = JSON.parse(await readFile(path.join(ROOT, 'data', 'locations.json'), 'utf8'));
  const out = [];
  for (const [work, w] of Object.entries(doc.works ?? {})) {
    for (const p of w.places ?? []) {
      if (p.tourapi?.contentId) {
        out.push({ work, name: p.name, nameKo: p.nameKo, contentId: String(p.tourapi.contentId) });
      }
    }
  }
  return out;
}

async function saveImage(buf, outPath, { canModify }) {
  const sharp = (await import('sharp')).default;
  await mkdir(path.dirname(outPath), { recursive: true });
  if (!canModify) {
    // 변경금지 — 바이트 그대로 저장한다
    await writeFile(outPath, buf);
    const meta = await sharp(buf).metadata();
    return { width: meta.width, height: meta.height, bytes: buf.length, modified: false };
  }
  const img = sharp(buf).rotate();
  const meta = await img.metadata();
  const pipeline = meta.width > MAX_WIDTH ? img.resize({ width: MAX_WIDTH }) : img;
  const out = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
  await writeFile(outPath, out);
  const outMeta = await sharp(out).metadata();
  return { width: outMeta.width, height: outMeta.height, bytes: out.length, modified: true };
}

export async function main() {
  assertTourApiKey();
  const targets = await loadTargets();
  if (targets.length === 0) throw new Error('contentId 가 있는 장소가 없습니다. 먼저 enrich-locations 를 실행하세요.');
  log.info(`대상 장소 ${targets.length}곳`);

  const records = [];
  const knownHashes = await loadKnownHashes(IMG_ROOT);
  let apiFailures = 0, saved = 0, rejected = 0, skippedDup = 0;

  for (const t of targets) {
    const res = await fetchImages(t.contentId, { log });
    if (res === null) { apiFailures++; log.warn(`이미지 조회 실패: ${t.name}`); continue; }
    rejected += res.rejected;
    if (res.usable.length === 0) { log.info(`${t.name}: 사용 가능한 이미지 없음 (전체 ${res.total}건)`); continue; }

    for (const [i, im] of res.usable.entries()) {
      const code = licenseCode(im.license);
      if (!code) { rejected++; continue; }          // 이중 방어
      let buf;
      try {
        const r = await fetch(im.src, { signal: AbortSignal.timeout(20000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        buf = Buffer.from(await r.arrayBuffer());
      } catch (e) { log.warn(`내려받기 실패 ${im.src}: ${e.message}`); continue; }

      /* 내용이 같은 사진이 이미 있으면 받지 않는다. 이름이 달라도 마찬가지다. */
      const hash = createHash('sha256').update(buf).digest('hex');
      if (knownHashes.has(hash)) {
        log.info(`건너뜀 — 같은 사진이 이미 있다: ${knownHashes.get(hash)}`);
        skippedDup++;
        continue;
      }

      const file = `${slugify(t.name)}-${i + 1}.jpg`;
      const rel = path.join('src', 'assets', 'images', 'scenes', file);
      const info = await saveImage(buf, path.join(IMG_DIR, file), { canModify: im.canModify });
      knownHashes.set(hash, rel.split(path.sep).join('/'));
      saved++;

      records.push({
        contentId: t.contentId, work: t.work, place: t.name, placeKo: t.nameKo,
        file, path: rel.replace(/\\/g, '/'),
        // 기사 frontmatter 에 그대로 옮겨 쓸 수 있는 형태로 만들어 둔다
        frontmatter: {
          src: `../../assets/images/scenes/${file}`,
          alt: `${t.name}${t.nameKo ? ` (${t.nameKo})` : ''} — 한국관광공사 제공 사진`,
          license: code,
          sourceUrl: im.sourceUrl,
          credit: '한국관광공사',
        },
        licenseLabel: im.license,
        canModify: im.canModify,
        resized: info.modified,
        width: info.width, height: info.height, bytes: info.bytes,
        originalName: im.name,
        fetchedAt: new Date().toISOString().slice(0, 10),
      });
      log.info(`저장 ${file} — ${info.width}×${info.height}, ${(info.bytes / 1024).toFixed(0)}KB, ${im.license}`);
    }
  }

  // 오늘의 원칙: 전부 실패했으면 조용히 성공하지 않는다
  if (skippedDup) log.info(`중복으로 건너뛴 사진 ${skippedDup}장 — 이미 저장소에 있는 것들이다.`);
  if (saved === 0 && skippedDup === 0) {
    throw new Error(
      `이미지를 한 장도 저장하지 못했습니다 (API 실패 ${apiFailures} · 저작권 미확인 ${rejected}).\n` +
      `  TourAPI 접속 상태를 먼저 확인하세요.`);
  }

  await mkdir(path.dirname(META), { recursive: true });
  await writeFile(META, JSON.stringify({
    _comment: [
      '한국관광공사 이미지 수집 결과. 저작권 유형을 API 응답에서 확인한 것만 담는다.',
      'kogl-1 = 출처표시 (변형 가능) / kogl-3 = 출처표시-변경금지 (원본 그대로만)',
      '',
      'frontmatter 블록은 기사에 그대로 붙여 넣을 수 있게 만들어 둔 것이다.',
      'alt 는 기본값이므로 기사를 쓸 때 장면에 맞게 고쳐 써야 한다.',
      '',
      '출처 표기 의무: 한국관광공사',
    ],
    generatedAt: new Date().toISOString(),
    stats: { targets: targets.length, saved, rejected, apiFailures, skippedDup },
    images: records,
  }, null, 2) + '\n', 'utf8');

  console.log(`\n저장 ${saved}장 · 저작권 미확인 제외 ${rejected}장 · 조회 실패 ${apiFailures}곳`);
  console.log('메타데이터:', path.relative(ROOT, META));
  return { saved, rejected, apiFailures };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { log.error(e.message); process.exit(1); });
}
