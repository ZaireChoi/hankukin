#!/usr/bin/env node
/**
 * Pull official place records from 한국관광공사 TourAPI and write a city file.
 *
 *   node scripts/tourapi-ingest.mjs --area 1 --city seoul --name 서울
 *
 * Why a script and not a runtime fetch: the daily call quota is finite and a
 * traveler opening a plan must not trigger a live call per place. Places change
 * slowly; running this on a schedule is cheaper, faster and offline-safe.
 *
 * What it does NOT do: invent anything. Every field it writes comes from the
 * API response and is tagged with the source and the date it was fetched.
 * Dwell time, walking load and meal budgets are NOT in TourAPI — those stay
 * planning estimates and are written as such, visually separate, exactly like
 * the hand-checked Gyeongju rows.
 *
 * Verify before trusting: the base path and operation names below follow the
 * current GW services. If the portal shows a different version for your
 * approved dataset, change SERVICE and OP here — nothing else depends on them.
 */

import fs from "node:fs";
import path from "node:path";

const KEY = process.env.TOURAPI_SERVICE_KEY;
if (!KEY) {
  console.error(`
  TOURAPI_SERVICE_KEY is not set.

  1. Apply at data.go.kr (see .env.example for the dataset links)
  2. Copy the DECODED service key
  3. TOURAPI_SERVICE_KEY=... node scripts/tourapi-ingest.mjs --area 1 --city seoul --name 서울
`);
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean).map((s) => {
    const [k, ...v] = s.trim().split(/\s+/);
    return [k, v.join(" ")];
  }),
);

const AREA = args.area;              // TourAPI areaCode: 1 서울, 6 부산, 35 경북 …
const CITY = args.city;              // our internal id, e.g. "seoul"
const NAME = args.name ?? CITY;      // Korean display name used by the picker
const ROWS = Number(args.rows ?? 60);
if (!AREA || !CITY) {
  console.error("  --area and --city are required. e.g. --area 1 --city seoul --name 서울");
  process.exit(1);
}

/**
 * One host per language. Add a line here when a language is approved.
 *
 * VERIFIED 2026-08-17 against a live key. Three things are not in the docs and
 * cost an afternoon to find:
 *
 *  1. Each language service is its OWN catalogue with its OWN contentid space.
 *     경복궁 is contentid 126508 in KorService2; that id returns 0 rows in
 *     EngService2. You cannot join languages on contentid.
 *
 *  2. The foreign-language services use a DIFFERENT contentTypeId scheme
 *     (76/78/79/80/82/85) from the Korean one (12/14/15/28/38/39).
 *
 *  3. The join key that does work: foreign titles carry the Korean name in
 *     trailing parentheses — "Gyeongnidan Street (경리단길)". Extract it.
 */
const SERVICE = {
  ko: "KorService2",
  en: "EngService2",
  ja: "JpnService2",
  "zh-Hans": "ChsService2",
  "zh-Hant": "ChtService2",
};
const BASE = "https://apis.data.go.kr/B551011";
const OP = "areaBasedList2";

/** contentTypeId → our category. Anything unmapped is skipped, not guessed. */
const CATEGORY_KO = { 12:"heritage", 14:"heritage", 15:"experience", 28:"family", 38:"shopping", 39:"food" };
const CATEGORY_INTL = { 76:"heritage", 78:"heritage", 85:"experience", 80:"family", 79:"shopping", 82:"food" };

/**
 * 15/85 is 축제·공연·행사 — temporary events with an end date. A trip planner
 * that offers an exhibition which closed last month is worse than one that
 * offers nothing, so events are excluded by default.
 */
const SKIP_CATEGORIES = new Set(["experience"]);

/** "Gyeongnidan Street (경리단길)" → "경리단길" */
const koreanInParens = (title = "") => {
  const m = String(title).match(/\(([^()]*[가-힣][^()]*)\)\s*$/);
  return m ? m[1].trim() : "";
};
/** "Gyeongnidan Street (경리단길)" → "Gyeongnidan Street" */
const stripParens = (title = "") =>
  String(title).replace(/\s*\([^()]*[가-힣][^()]*\)\s*$/, "").trim();

const LANGS = (process.env.TOURAPI_LANGS ?? "ko,en")
  .split(",").map((s) => s.trim()).filter((l) => SERVICE[l]);

const today = args.date ?? new Date().toISOString().slice(0, 10);

async function fetchPage(lang, pageNo) {
  const url = new URL(`${BASE}/${SERVICE[lang]}/${OP}`);
  url.searchParams.set("serviceKey", KEY);
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "DoorToDoor");
  url.searchParams.set("_type", "json");
  url.searchParams.set("areaCode", AREA);
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("arrange", "A");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`${lang}: HTTP ${res.status}`);
  const text = await res.text();
  if (text.trimStart().startsWith("<")) {
    throw new Error(`${lang}: got XML, not JSON — usually a bad or ENCODED service key`);
  }
  const json = JSON.parse(text);
  const items = json?.response?.body?.items?.item ?? [];
  return Array.isArray(items) ? items : items ? [items] : [];
}

async function fetchLang(lang) {
  const pages = Math.max(1, Math.ceil(ROWS / 100));
  const out = [];
  for (let p = 1; p <= pages; p++) {
    const batch = await fetchPage(lang, p);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

const esc = (s = "") => String(s).replace(/"/g, "'").replace(/\s+/g, " ").trim();

console.log(`\n  TourAPI → ${CITY} (areaCode ${AREA}), languages: ${LANGS.join(", ")}\n`);

const byLang = {};
for (const lang of LANGS) {
  try {
    byLang[lang] = await fetchLang(lang);
    console.log(`  ✓ ${lang.padEnd(8)} ${byLang[lang].length} records`);
  } catch (e) {
    console.log(`  ✗ ${lang.padEnd(8)} ${e.message}`);
  }
}

// English is the base: it is the only catalogue guaranteed to carry both the
// English name and the Korean name (in parentheses) on every row.
const base = byLang.en ?? [];
if (!base.length) {
  console.error("\n  Nothing returned. Check the service key and areaCode.\n");
  process.exit(1);
}

/** Index each foreign catalogue by the Korean name hidden in its title. */
const index = (lang) =>
  new Map(
    (byLang[lang] ?? [])
      .map((r) => [koreanInParens(r.title), r])
      .filter(([k]) => k),
  );
const idx = Object.fromEntries(LANGS.filter((l) => l !== "ko").map((l) => [l, index(l)]));

const rows = base
  .filter((r) => {
    const cat = CATEGORY_INTL[Number(r.contenttypeid)];
    return cat && !SKIP_CATEGORIES.has(cat) && r.mapx && r.mapy && koreanInParens(r.title);
  })
  .map((r) => {
    const korean = koreanInParens(r.title);
    const nameIn = (lang) => esc(stripParens(idx[lang]?.get(korean)?.title ?? ""));
    return {
      city: CITY,
      id: `${CITY}-${r.contentid}`,
      contentId: String(r.contentid),
      category: CATEGORY_INTL[Number(r.contenttypeid)],
      ko: esc(korean),
      en: esc(stripParens(r.title)),
      ja: nameIn("ja"),
      zhHans: nameIn("zh-Hans"),
      zhHant: nameIn("zh-Hant"),
      lat: Number(r.mapy),
      lng: Number(r.mapx),
      addressKo: esc(r.addr1),
      addressEn: esc(r.addr1),
    };
  });

const out = `import type { JourneyOption } from "../../lib/types";

/**
 * ${NAME} · ${CITY} — generated from 한국관광공사 TourAPI on ${today}.
 * Regenerate: node scripts/tourapi-ingest.mjs --area ${AREA} --city ${CITY} --name ${NAME}
 *
 * OFFICIAL from the API : name (per language), coordinates, address, category
 * PLANNING ESTIMATE     : stayMinutes, transferMinutes, cost — TourAPI does not
 *                         publish these. They are seeded defaults and MUST stay
 *                         visually separate from the official fields.
 *
 * Hours and fees are intentionally left as "확인 필요". detailIntro2 returns
 * some of them per contentTypeId — wire that in before claiming "공식".
 */
export const ${CITY}Options: JourneyOption[] = [
${rows
  .map(
    (p) =>
      `  {city:"${p.city}",id:"${p.id}",category:"${p.category}",ko:"${p.ko}",en:"${p.en || p.ko}",` +
      `zoneKo:"${p.addressKo}",zoneEn:"${p.addressEn || p.addressKo}",` +
      `stayMinutes:60,transferMinutes:15,cost:0,` +
      `costKo:"요금 확인 필요",costEn:"Fee needs checking",` +
      `hoursKo:"운영시간 확인 필요",hoursEn:"Hours need checking",` +
      `sourceKo:"한국관광공사 TourAPI · ${today} 수집 · 요금·시간 미확인",` +
      `sourceEn:"KTO TourAPI · fetched ${today} · fee and hours unverified",` +
      `kind:"${p.category.toUpperCase()}",walk:"medium"},`,
  )
  .join("\n")}
];

/** Coordinates and names that must never be translated away. */
export const ${CITY}Coordinates = {
${rows
  .map(
    (p) =>
      `  "${p.id}":{lat:${p.lat},lng:${p.lng},city:"${p.city}",ko:"${p.ko}",en:"${p.en || p.ko}",rm:""},`,
  )
  .join("\n")}
};
`;

const file = path.join("app/data/places", `${CITY}.generated.ts`);
fs.writeFileSync(file, out);
console.log(`\n  → ${file}  (${rows.length} places)\n`);
console.log(`  Next: romanization (rm) is empty — fill it, it is what a driver reads.`);
console.log(`  Then register the city in app/data/places/index.ts with coverage "seeded".\n`);
