#!/usr/bin/env node
/**
 * 장소 보강 — data/locations.json 의 장소를 한국관광공사 데이터로 채운다.
 *
 * 이 스크립트가 하는 일:
 *   운영자가 '작품 → 장소 이름' 만 적어두면, 주소·좌표·소개글·공식 출처를 자동으로 붙인다.
 *   출처는 public_institution 등급이므로 이것만으로 게이트가 열린다.
 *
 * 이 스크립트가 하지 않는 일:
 *   장소를 새로 발굴하지 않는다. '어느 작품의 촬영지인가' 는 여전히 사람이 확인해야 한다.
 *   TourAPI 는 관광 데이터베이스이지 촬영지 데이터베이스가 아니다.
 *
 * 실행: node scripts/enrich-locations.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertTourApiKey, resolvePlace, fetchOverview, toSource, mentionsFilming, RESOLVE } from './lib/tourapi.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const log = {
  info: (...a) => console.log('[enrich]', ...a),
  warn: (...a) => console.warn('[enrich][warn]', ...a),
  error: (...a) => console.error('[enrich][error]', ...a),
};

export async function main() {
  assertTourApiKey();
  const p = path.join(ROOT, 'data', 'locations.json');
  const doc = JSON.parse(await readFile(p, 'utf8'));
  const works = doc.works ?? {};

  const report = [];
  for (const [workTitle, work] of Object.entries(works)) {
    for (const place of work.places ?? []) {
      // 이미 공공기관 출처가 붙어 있으면 건너뛴다
      if (place.tourapi?.contentId) { report.push({ work: workTitle, place: place.nameKo ?? place.name, status: 'skip', note: '이미 보강됨' }); continue; }

      const query = place.nameKo ?? place.name;
      const expectRegion = place.expectRegion ?? null;
      const r = await resolvePlace(query, { expectRegion, log });

      if (r.status === RESOLVE.OK) {
        const it = r.place;
        const overview = await fetchOverview(it.contentId, { log });
        const filming = mentionsFilming(overview ?? '');

        place.address = place.address ?? it.address;
        place.lat = place.lat ?? it.lat;
        place.lng = place.lng ?? it.lng;
        place.tourapi = {
          contentId: it.contentId, title: it.title, address: it.address,
          lat: it.lat, lng: it.lng, image: it.image, modifiedAt: it.modifiedAt,
          overview: overview ? overview.slice(0, 600) : null,
          mentionsFilming: filming.mentioned, filmingHits: filming.hits,
          resolvedBy: r.note,
        };
        // 공공기관 출처 추가 (중복 방지)
        work.sources ??= [];
        const src = toSource(it);
        if (!work.sources.some((s) => s.url === src.url)) work.sources.push(src);

        report.push({ work: workTitle, place: query, status: 'ok',
                      note: `${it.title} · ${it.address ?? '주소없음'}${filming.mentioned ? ' · 촬영언급 있음' : ''}` });
      } else {
        // 실패해도 기록을 남긴다 — 같은 조사를 반복하지 않기 위해
        place.tourapiAttempt = { status: r.status, note: r.note, tried: r.tried,
                                 candidates: r.candidates?.map((c) => ({ title: c.title, address: c.address })) ?? null,
                                 attemptedAt: new Date().toISOString().slice(0, 10) };
        report.push({ work: workTitle, place: query, status: r.status, note: r.note });
      }
    }
  }

  await writeFile(p, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  console.table(report);
  const ok = report.filter((r) => r.status === 'ok').length;
  log.info(`보강 완료 ${ok}건 / 전체 ${report.length}건`);
  if (report.some((r) => r.status === RESOLVE.AMBIGUOUS)) {
    log.warn('후보가 여럿인 장소가 있습니다. locations.json 의 place 에 expectRegion(예: "강원")을 넣어 좁히세요.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { log.error(e.message); process.exit(1); });
}
