#!/usr/bin/env node
/**
 * Promote hours and closing days from 확인 필요 to 공식.
 *
 *   TOURAPI_SERVICE_KEY=... node scripts/enrich-hours.mjs app/data/places/seoul.generated.ts
 *
 * areaBasedList2 gives names, coordinates and category. It does NOT give
 * opening hours, so every ingested row starts life marked 확인 필요. detailIntro2
 * fills that gap — one call per place, per language.
 *
 * What 경복궁 actually returns (verified 2026-08-17):
 *
 *   usetime    [1월~2월/11월~12월]09:00~17:00 (입장마감 16:00) …
 *   restdate   매주 화요일 ※ 정기휴일이 공휴일과 겹칠 경우 개방
 *   parking    가능 (승용차 240대 / 버스 50대)
 *   infocenter 02-3700-3900
 *
 * Seasonal hours AND the last-admission time — which is the field that actually
 * ruins an itinerary, because arriving at 17:10 for a 17:00 cutoff means the
 * place is open and you still cannot go in.
 *
 * ── The rule this script exists to enforce ────────────────────────────────
 * Promotion is PER RECORD, never per file. Many rows come back with usetime
 * empty (a clinic, a small shop). Those stay 확인 필요. A blank field is not
 * permission to claim the place is open — it is the absence of information,
 * and the two must never be displayed the same way.
 */

import fs from "node:fs";

const KEY = process.env.TOURAPI_SERVICE_KEY;
const file = process.argv[2];

if (!KEY || !file) {
  console.error(`
  usage: TOURAPI_SERVICE_KEY=... node scripts/enrich-hours.mjs <city>.generated.ts
`);
  process.exit(1);
}

const BASE = "https://apis.data.go.kr/B551011";
/** Korean is the richest catalogue for operating information. */
const SERVICE = "KorService2";

/** Our category → the Korean contentTypeId detailIntro2 expects. */
const TYPE_FOR = { heritage: 12, family: 28, shopping: 38, food: 39, experience: 15, rest: 12, comfort: 12 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s = "") => String(s).replace(/"/g, "'").replace(/\s+/g, " ").trim();

async function intro(contentId, contentTypeId) {
  const url =
    `${BASE}/${SERVICE}/detailIntro2?serviceKey=${KEY}&MobileOS=ETC&MobileApp=DoorToDoor` +
    `&_type=json&contentId=${contentId}&contentTypeId=${contentTypeId}`;
  const res = await fetch(url);
  const text = await res.text();
  if (text.trimStart().startsWith("<")) throw new Error("XML response — check the DECODED key");
  const item = JSON.parse(text)?.response?.body?.items?.item;
  return (Array.isArray(item) ? item[0] : item) ?? null;
}

const today = new Date().toISOString().slice(0, 10);
let src = fs.readFileSync(file, "utf8");

/** Every row that still says 확인 필요, with its contentId and category. */
const targets = [...src.matchAll(/id:"([a-z]+)-(\d+)",category:"(\w+)"/g)]
  .map(([, city, cid, cat]) => ({ city, cid, cat }));

console.log(`\n  ${file}\n  ${targets.length} places to check — one call each\n`);

let promoted = 0, blank = 0, failed = 0;

for (const t of targets) {
  const typeId = TYPE_FOR[t.cat];
  if (!typeId) { blank++; continue; }
  let rec;
  try {
    rec = await intro(t.cid, typeId);
  } catch (e) {
    failed++;
    continue;
  }
  await sleep(120);                       // stay polite to a public service

  const usetime = esc(rec?.usetime);
  const restdate = esc(rec?.restdate);

  // A blank field means "we do not know", not "always open".
  if (!usetime && !restdate) { blank++; continue; }

  const hoursKo = [usetime, restdate && `휴무 ${restdate}`].filter(Boolean).join(" · ");
  const hoursEn = usetime
    ? `Official hours (Korean source) — see 안내: ${usetime}`.slice(0, 240)
    : "Official closing days published; hours not listed";

  const idRe = new RegExp(`(id:"${t.city}-${t.cid}",[^}]*?)hoursKo:"[^"]*",hoursEn:"[^"]*",sourceKo:"[^"]*",sourceEn:"[^"]*"`);
  const before = src;
  src = src.replace(idRe, (m, head) =>
    `${head}hoursKo:"${hoursKo.slice(0, 300)}",hoursEn:"${hoursEn.replace(/"/g, "'")}",` +
    `sourceKo:"한국관광공사 TourAPI detailIntro2 · ${today} 확인 · 공식",` +
    `sourceEn:"KTO TourAPI detailIntro2 · checked ${today} · official"`);
  if (src !== before) promoted++;
}

fs.writeFileSync(file, src);

console.log(`
  ${String(promoted).padStart(4)}  promoted to 공식   (usetime or restdate present, dated ${today})
  ${String(blank).padStart(4)}  left 확인 필요      (source published nothing — absence is not "open")
  ${String(failed).padStart(4)}  call failed

  Hours change. Re-run this on a schedule and the date stamp moves with it;
  a 공식 label with a stale date is worse than no label at all.
`);
