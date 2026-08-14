#!/usr/bin/env node
/**
 * 궁궐 사진 수집 — 국가유산청 궁능유적본부.
 *
 * 왜 이 경로인가 (2026-08-13):
 *   TourAPI 는 장애, 포토코리아는 다운로드에 로그인이 걸린다.
 *   궁능유적본부는 둘 다 아니다. 페이지에 라이선스가 명시돼 있고
 *   /afile/previewThumbnail/<id> 로 2000px 급 원본을 바로 준다.
 *   그리고 궁궐 사진은 여기가 원본에 가깝다.
 *
 * 안전장치:
 *   ① 건물명 ↔ id 짝은 사람이 실제 DOM 에서 확인한 것만 쓴다 (data/heritage-images.json).
 *      스크래퍼가 짝을 추측하게 두지 않는다. 잘못 짝지으면 엉뚱한 건물 사진이 실린다.
 *   ② 내려받은 것이 진짜 이미지인지 확인한다. 오류 페이지를 jpg 로 저장하지 않는다.
 *   ③ 한 장도 못 받으면 throw. 빈 결과를 조용히 커밋하지 않는다.
 *
 * 실행: node scripts/fetch-heritage-images.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data', 'heritage-images.json');
const OUT_DIR = path.join(ROOT, 'src', 'assets', 'images', 'heritage');
const META = path.join(ROOT, 'data', 'heritage-images.result.json');
const BASE = 'https://royal.khs.go.kr/afile/previewThumbnail/';
const MAX_WIDTH = 1600;
const QUALITY = 82;
const MIN_BYTES = 20_000;         // 이보다 작으면 사진이 아니라 오류 응답일 가능성이 높다

const log = {
  info: (...a) => console.log('[heritage]', ...a),
  warn: (...a) => console.warn('[heritage][warn]', ...a),
  error: (...a) => console.error('[heritage][error]', ...a),
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * sharp 는 있으면 쓰고 없으면 원본을 그대로 저장한다.
 *
 * 왜 선택적인가 (2026-08-13):
 *   이 스크립트는 운영자 PC(한국)에서 돌아야 한다. GitHub Actions(미국)에서는
 *   .go.kr 사이트에 접속이 되지 않는다 — TourAPI 와 궁능유적본부 둘 다 같은 증상이었다.
 *   로컬 환경은 통제할 수 없으므로, 없어도 되는 의존성은 없어도 되게 만든다.
 *   리사이즈를 못 해도 Astro 가 빌드 때 최적화하므로 결과물은 같다.
 */
async function loadSharp() {
  try { return (await import('sharp')).default; }
  catch { log.info('sharp 없음 — 원본을 그대로 저장합니다 (빌드 때 Astro 가 최적화합니다)'); return null; }
}

export async function main() {
  const doc = JSON.parse(await readFile(DATA, 'utf8'));
  const sharp = await loadSharp();
  await mkdir(OUT_DIR, { recursive: true });

  const records = [];
  let ok = 0, failed = 0;

  for (const [siteKo, site] of Object.entries(doc.sites ?? {})) {
    for (const b of site.buildings ?? []) {
      const url = BASE + b.id;
      let buf;
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        buf = Buffer.from(await r.arrayBuffer());
      } catch (e) { failed++; log.warn(`받기 실패 ${b.ko}: ${e.message}`); continue; }

      // 오류 페이지를 사진으로 착각하지 않는다
      if (buf.length < MIN_BYTES) { failed++; log.warn(`${b.ko}: 응답이 너무 작다 (${buf.length}B) — 건너뜀`); continue; }
      // JPEG 시그니처 확인 — sharp 가 없어도 이건 할 수 있다
      if (!(buf[0] === 0xFF && buf[1] === 0xD8)) {
        failed++; log.warn(`${b.ko}: JPEG 이 아님 (오류 페이지로 보임) — 건너뜀`); continue;
      }

      const file = `${slug(site.en)}-${slug(b.en)}.jpg`;
      let out = buf, o = { width: null, height: null };
      if (sharp) {
        const meta = await sharp(buf).metadata();
        if (!meta.width || meta.width < 600) { failed++; log.warn(`${b.ko}: 너무 작다 (${meta.width}px) — 건너뜀`); continue; }
        const img = sharp(buf).rotate();
        out = await (meta.width > MAX_WIDTH ? img.resize({ width: MAX_WIDTH }) : img)
          .jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
        o = await sharp(out).metadata();
      }
      await writeFile(path.join(OUT_DIR, file), out);
      ok++;

      records.push({
        site: siteKo, siteEn: site.en, buildingKo: b.ko, buildingEn: b.en, id: b.id, file,
        frontmatter: {
          src: `../../assets/images/heritage/${file}`,
          alt: `${b.en} at ${site.en}, Seoul`,
          license: doc.license,
          sourceUrl: site.sourceUrl,
          credit: doc.credit,
        },
        width: o.width, height: o.height, bytes: out.length, resized: Boolean(sharp),
        fetchedAt: new Date().toISOString().slice(0, 10),
      });
      const dim = o.width ? `${o.width}×${o.height}, ` : '';
      log.info(`${b.ko} → ${file} (${dim}${(out.length / 1024).toFixed(0)}KB)`);
    }
  }

  if (ok === 0) throw new Error(`사진을 한 장도 받지 못했습니다 (실패 ${failed}). 궁능유적본부 접속 상태를 확인하세요.`);

  await writeFile(META, JSON.stringify({
    _comment: [
      '궁능유적본부 사진 수집 결과. 공공누리 제1유형 — 출처표시 시 상업적 이용·변형 가능.',
      'frontmatter 블록은 기사에 그대로 붙여 넣을 수 있다.',
      'alt 는 기본값이므로 기사 맥락에 맞게 고쳐 쓰는 편이 낫다.',
      '출처 표기 의무: 국가유산청 궁능유적본부',
    ],
    generatedAt: new Date().toISOString(),
    stats: { ok, failed },
    images: records,
  }, null, 2) + '\n', 'utf8');

  console.log(`\n받음 ${ok}장 · 실패 ${failed}장`);
  console.log('메타데이터:', path.relative(ROOT, META));
  return { ok, failed };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { log.error(e.message); process.exit(1); });
}
