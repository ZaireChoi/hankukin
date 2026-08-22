#!/usr/bin/env node
/**
 * 위키미디어 공용에서 사진을 받아온다 — 관광공사에 없는 소재를 위해.
 *
 * 왜 이 경로가 필요했나 (2026-08-22, 찜질방 편).
 *   TourAPI 는 공공이 관리하는 관광지만 등재한다. 그래서 재고 54곳에
 *   목욕·찜질·사우나·온천이 **한 장도 없었다.** 찜질방·세신·셀프사진관·횟집처럼
 *   민간 업소인 소재는 앞으로도 계속 비게 된다. 소재 은행에 남은 것이 대부분 그쪽이다.
 *
 * 안전장치 — fetch-images.mjs(TourAPI) 와 같은 것을 그대로 옮겼다.
 *   ① 라이선스를 **API 응답(extmetadata.LicenseShortName)에서 읽는다.** 통념으로 판단하지 않는다.
 *      CC0 · CC BY · CC BY-SA 만 통과. 그 외·누락은 버린다.
 *      (공용에는 「fair use」 「non-free」 파일도 있다. 그건 우리가 쓸 수 있는 것이 아니다.)
 *   ② **CC BY / CC BY-SA 는 저작자 표시가 의무다.** Artist 를 못 읽으면 그 파일은 버린다.
 *      CC0 은 의무가 아니지만 우리는 그래도 적는다.
 *   ③ 내용 해시로 중복을 막는다. 이름이 달라도 같은 바이트는 두 번 받지 않는다.
 *   ④ 파일 제목에 expectWords 가 하나도 없으면 버린다 — 검색 오매칭 방어.
 *   ⑤ 전부 실패하면 throw 한다. 빈 결과를 조용히 커밋하지 않는다.
 *
 * 이 스크립트가 **하지 않는** 것.
 *   기사 frontmatter 를 자동으로 쓰지 않는다. 결과는 data/commons-images.json 에만 남는다.
 *   사진은 사람이 한 장씩 열어 보고, data/photo-verified.json 에 무엇이 찍혀 있는지
 *   적은 뒤에야 기사에 들어간다. photo-sanity 게이트가 그것을 강제한다.
 *
 * 실행:  node scripts/fetch-commons-images.mjs
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR = path.join(ROOT, 'src', 'assets', 'images', 'places');
const IMG_ROOT = path.join(ROOT, 'src', 'assets', 'images');
const REQ = path.join(ROOT, 'data', 'commons-requests.json');
const META = path.join(ROOT, 'data', 'commons-images.json');

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'HANKUKIN/1.0 (https://www.hankuk-in.com; contact via site)';
const MIN_WIDTH = 900;
const MAX_WIDTH = 1600;
const JPEG_QUALITY = 82;

const log = {
  info: (...a) => console.log('[commons]', ...a),
  warn: (...a) => console.warn('[commons][warn]', ...a),
  error: (...a) => console.error('[commons][error]', ...a),
};

/**
 * 라이선스 문자열 → 스키마의 license 코드.
 *
 * 순서가 중요하다. 'CC BY-SA 3.0' 은 'CC BY' 도 포함하므로 SA 를 먼저 본다.
 * 판단이 안 서면 null 을 돌려주고, 부르는 쪽이 버린다. **모르면 안 쓴다.**
 */
export function licenseCode(label) {
  const s = String(label || '').toLowerCase();
  if (!s) return null;
  if (s.includes('cc0') || s.includes('public domain') || s.includes('pd-')) return 'cc0';
  if (s.includes('cc by-sa') || s.includes('cc-by-sa')) return 'cc-by-sa';
  if (s.includes('cc by') || s.includes('cc-by')) return 'cc-by';
  return null;
}

/** HTML 조각으로 오는 필드를 평문으로. 저작자 표시에 태그가 섞이면 안 된다. */
const plain = (v) => String(v || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

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

async function search(term, limit) {
  const u = new URL(API);
  u.search = new URLSearchParams({
    action: 'query', format: 'json', origin: '*',
    generator: 'search', gsrnamespace: '6', gsrlimit: String(Math.max(limit * 6, 24)),
    gsrsearch: term,
    prop: 'imageinfo', iiprop: 'extmetadata|url|size',
  }).toString();
  const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`검색 실패 HTTP ${r.status}`);
  const j = await r.json();
  return Object.values(j?.query?.pages ?? {});
}

async function saveImage(buf, outPath) {
  const sharp = (await import('sharp')).default;
  await mkdir(path.dirname(outPath), { recursive: true });
  const img = sharp(buf).rotate();
  const meta = await img.metadata();
  const pipeline = meta.width > MAX_WIDTH ? img.resize({ width: MAX_WIDTH }) : img;
  const out = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
  await writeFile(outPath, out);
  const m = await sharp(out).metadata();
  return { width: m.width, height: m.height, bytes: out.length };
}

export async function main() {
  const doc = JSON.parse(await readFile(REQ, 'utf8'));
  const requests = doc.requests ?? [];
  if (requests.length === 0) { log.info('요청이 없습니다. 아무 일도 하지 않습니다.'); return { saved: 0 }; }

  const knownHashes = await loadKnownHashes(IMG_ROOT);
  const existing = new Set((await readdir(IMG_DIR).catch(() => [])).map((f) => f.replace(/-\d+\.[a-z]+$/i, '')));

  const records = [];
  let saved = 0, rejectedLicence = 0, rejectedName = 0, rejectedSmall = 0, skippedDup = 0, failures = 0;

  for (const req of requests) {
    if (existing.has(req.slug)) { log.info(`건너뜀 — 이미 받은 슬러그: ${req.slug}`); continue; }

    let pages;
    try { pages = await search(req.search, req.limit ?? 4); }
    catch (e) { failures++; log.warn(`${req.slug}: ${e.message}`); continue; }

    let n = 0;
    for (const p of pages) {
      if (n >= (req.limit ?? 4)) break;
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const title = p.title.replace(/^File:/, '');
      const m = ii.extmetadata ?? {};

      // ④ 이름 방어 — 검색이 엉뚱한 것을 물어 왔는지 먼저 본다
      const words = req.expectWords ?? [];
      if (words.length && !words.some((w) => title.toLowerCase().includes(String(w).toLowerCase()))) {
        rejectedName++; continue;
      }
      if ((ii.width ?? 0) < MIN_WIDTH) { rejectedSmall++; continue; }

      // ① 라이선스는 응답에서 읽는다
      const label = plain(m.LicenseShortName?.value);
      const code = licenseCode(label);
      if (!code) { rejectedLicence++; log.info(`버림 — 라이선스 불명/부적합: ${title} (${label || '표기 없음'})`); continue; }

      // ② CC BY 계열은 저작자 표시가 의무다. 못 읽으면 쓸 수 없다.
      const artist = plain(m.Artist?.value);
      if (code !== 'cc0' && !artist) {
        rejectedLicence++; log.info(`버림 — ${label} 인데 저작자를 읽을 수 없다: ${title}`); continue;
      }

      let buf;
      try {
        const r = await fetch(ii.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        buf = Buffer.from(await r.arrayBuffer());
      } catch (e) { failures++; log.warn(`내려받기 실패 ${title}: ${e.message}`); continue; }

      // ③ 같은 바이트는 두 번 받지 않는다
      const hash = createHash('sha256').update(buf).digest('hex');
      if (knownHashes.has(hash)) { skippedDup++; log.info(`건너뜀 — 같은 사진이 이미 있다: ${knownHashes.get(hash)}`); continue; }

      n++;
      const file = `${req.slug}-${n}.jpg`;
      const info = await saveImage(buf, path.join(IMG_DIR, file));
      knownHashes.set(hash, `src/assets/images/places/${file}`);
      saved++;

      records.push({
        slug: req.slug, file, commonsTitle: title,
        frontmatter: {
          src: `../../assets/images/places/${file}`,
          alt: '(사람이 열어 보고 무엇이 찍혀 있는지 직접 적을 것 — 이 줄을 그대로 두지 말 것)',
          license: code,
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
          credit: artist ? `${artist} (Wikimedia Commons, ${label})` : `Wikimedia Commons, ${label}`,
        },
        licenseLabel: label,
        artist: artist || null,
        width: info.width, height: info.height, bytes: info.bytes,
        fetchedAt: new Date().toISOString().slice(0, 10),
      });
      log.info(`저장 ${file} — ${info.width}×${info.height}, ${(info.bytes / 1024).toFixed(0)}KB, ${label}`);
    }
  }

  // ⑤ 전부 실패했으면 조용히 성공하지 않는다
  if (saved === 0 && skippedDup === 0) {
    throw new Error(
      `사진을 한 장도 저장하지 못했습니다 ` +
      `(라이선스 부적합 ${rejectedLicence} · 이름 불일치 ${rejectedName} · 너무 작음 ${rejectedSmall} · 통신 실패 ${failures}).\n` +
      (failures > 0
        ? `  통신 실패가 ${failures}건입니다 — commons.wikimedia.org 에 닿지 못했을 가능성이 큽니다.\n` +
          `  이 스크립트는 운영자 컴퓨터에서 돌립니다. 자동화 샌드박스는 바깥으로 못 나갑니다.\n`
        : `  검색어가 너무 좁거나, 공용에 쓸 수 있는 라이선스의 사진이 없을 수 있습니다.\n`));
  }

  await mkdir(path.dirname(META), { recursive: true });
  await writeFile(META, JSON.stringify({
    _comment: [
      '위키미디어 공용 수집 결과. 라이선스를 API 응답에서 확인한 것만 담는다.',
      'cc0 = 저작권 포기 / cc-by = 출처표시 / cc-by-sa = 출처표시-동일조건',
      '',
      '**frontmatter.alt 는 일부러 비워 놓았다.** 사람이 사진을 열어 보고 직접 적어야 한다.',
      '그리고 data/photo-verified.json 에 무엇이 찍혀 있는지 한 줄 남겨야',
      'photo-sanity 게이트가 발행을 허락한다.',
      '',
      'CC BY / CC BY-SA 는 저작자 표시가 의무다. credit 을 지우면 라이선스 위반이다.',
    ],
    generatedAt: new Date().toISOString(),
    stats: { saved, rejectedLicence, rejectedName, rejectedSmall, skippedDup, failures },
    images: records,
  }, null, 2) + '\n', 'utf8');

  console.log(`\n저장 ${saved}장 · 라이선스 부적합 ${rejectedLicence}장 · 이름 불일치 ${rejectedName}장 · 중복 ${skippedDup}장`);
  console.log('메타데이터:', path.relative(ROOT, META));
  console.log('\n다음 할 일: 받은 사진을 **한 장씩 열어 보고** alt 와 data/photo-verified.json 을 채우십시오.');
  return { saved, rejectedLicence, rejectedName, skippedDup, failures };
}

/*
 * argv[1] 이 없을 때가 있다 — `node -e` 로 이 파일을 import 해서 함수만 시험할 때.
 * 기존 스크립트들의 관용구를 그대로 옮겼더니 그 자리에서 터졌다.
 * 직접 실행인지 아닌지 판단하는 코드가 판단 대상보다 먼저 죽으면 안 된다.
 */
const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invoked && import.meta.url === invoked) {
  main().catch((e) => { log.error(e.message); process.exit(1); });
}
