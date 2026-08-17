#!/usr/bin/env node
/**
 * Build every city file from a harvested bundle instead of live API calls.
 *
 *   node scripts/ingest-from-bundle.mjs ~/Downloads/tourapi-bundle-2026-08-17.json
 *
 * Why this exists: the machines that run this build have no outbound network,
 * and the one place that does — a browser tab already on apis.data.go.kr — is
 * where the operator's service key lives. So the fetching happens there, the
 * transforming happens here, and the key never has to travel between them.
 *
 * The transformation is deliberately IDENTICAL to scripts/tourapi-ingest.mjs.
 * Two copies of the same rules would drift; the three hard-won API facts below
 * are the ones that took an afternoon to find, so they are restated where the
 * code that depends on them lives.
 *
 *   1. Each language service has its own contentid space. You cannot join
 *      languages on contentid.
 *   2. Foreign services use contentTypeId 76/78/79/80/82/85, not 12/14/…
 *   3. The join key that works is the Korean name in trailing parentheses:
 *      "Gyeongnidan Street (경리단길)" → 경리단길
 */

import fs from "node:fs";
import path from "node:path";

const bundlePath = process.argv[2];
if (!bundlePath) {
  console.error("\n  usage: node scripts/ingest-from-bundle.mjs <bundle.json>\n");
  process.exit(1);
}

const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
const today = bundle.fetchedAt ?? new Date().toISOString().slice(0, 10);

const CATEGORY_INTL = { 76: "heritage", 78: "heritage", 85: "experience", 80: "family", 79: "shopping", 82: "food" };
/** 85 is 축제·공연 — dated events. An exhibition that closed last month is
 *  worse than no suggestion at all, so events are excluded. */
const SKIP = new Set(["experience"]);

/**
 * Clinics and hospitals are not places to visit on a day plan.
 *
 * The English catalogue files medical facilities under contentTypeId 76, the
 * same bucket as palaces, so the first ingest offered "밝은눈안과병원" as a
 * heritage stop in Busan. Medical tourism is a real reason people come to
 * Korea, but it is an appointment, not a walk-in sight, and it needs booking
 * logic this planner does not have. Until it does, these rows stay out rather
 * than sit mislabelled among the temples.
 */
const MEDICAL = /(의원|병원|클리닉|성형외과|피부과|치과|안과|한의원|의료원|보건소|의학원|메디컬|비뇨기과|정형외과|산부인과|이비인후과)/;

const koreanInParens = (title = "") => {
  const m = String(title).match(/\(([^()]*[가-힣][^()]*)\)\s*$/);
  return m ? m[1].trim() : "";
};
const stripParens = (title = "") =>
  String(title).replace(/\s*\([^()]*[가-힣][^()]*\)\s*$/, "").trim();
const esc = (s = "") => String(s).replace(/"/g, "'").replace(/\s+/g, " ").trim();

const outDir = "app/data/places";
const written = [];
let grand = 0;

for (const [cityId, region] of Object.entries(bundle.regions ?? {})) {
  const base = region.langs?.en ?? [];
  if (!base.length) {
    console.log(`  ✗ ${cityId.padEnd(12)} no English rows — skipped`);
    continue;
  }

  const index = (lang) =>
    new Map(
      (region.langs?.[lang] ?? [])
        .map((r) => [koreanInParens(r.title), r])
        .filter(([k]) => k),
    );
  const idx = { ja: index("ja"), "zh-Hans": index("zh-Hans"), "zh-Hant": index("zh-Hant") };

  const rows = base
    .filter((r) => {
      const cat = CATEGORY_INTL[Number(r.contenttypeid)];
      const korean = koreanInParens(r.title);
      return cat && !SKIP.has(cat) && r.mapx && r.mapy && korean && !MEDICAL.test(korean);
    })
    .map((r) => {
      const korean = koreanInParens(r.title);
      const nameIn = (lang) => esc(stripParens(idx[lang]?.get(korean)?.title ?? ""));
      return {
        city: cityId,
        id: `${cityId}-${r.contentid}`,
        category: CATEGORY_INTL[Number(r.contenttypeid)],
        ko: esc(korean),
        en: esc(stripParens(r.title)),
        ja: nameIn("ja"),
        zhHans: nameIn("zh-Hans"),
        zhHant: nameIn("zh-Hant"),
        lat: Number(r.mapy),
        lng: Number(r.mapx),
        address: esc(r.addr1),
      };
    });

  if (!rows.length) {
    console.log(`  ✗ ${cityId.padEnd(12)} nothing usable after filtering`);
    continue;
  }

  const file = path.join(outDir, `${cityId}.generated.ts`);
  fs.writeFileSync(
    file,
    `import type { JourneyOption } from "../../lib/types";

/**
 * ${region.ko} · ${cityId} — generated from 한국관광공사 TourAPI on ${today}.
 * Regenerate: node scripts/ingest-from-bundle.mjs <bundle.json>
 *
 * OFFICIAL from the API : name per language, coordinates, address, category
 * PLANNING ESTIMATE     : stayMinutes, transferMinutes, cost — TourAPI does not
 *                         publish these. They are seeded defaults and stay
 *                         visually separate from the official fields.
 *
 * Hours and fees are "확인 필요" on purpose. detailIntro2 returns some of them
 * per place; wire that in before anything here claims "공식".
 */
export const ${cityId}GeneratedOptions: JourneyOption[] = [
${rows
  .map(
    (p) =>
      `  {city:"${p.city}",id:"${p.id}",category:"${p.category}",ko:"${p.ko}",en:"${p.en || p.ko}",` +
      (p.ja ? `ja:"${p.ja}",` : "") +
      (p.zhHans ? `zhHans:"${p.zhHans}",` : "") +
      (p.zhHant ? `zhHant:"${p.zhHant}",` : "") +
      `zoneKo:"${p.address}",zoneEn:"${p.address}",` +
      `stayMinutes:60,transferMinutes:15,cost:0,` +
      `costKo:"요금 확인 필요",costEn:"Fee needs checking",` +
      `hoursKo:"운영시간 확인 필요",hoursEn:"Hours need checking",` +
      `sourceKo:"한국관광공사 TourAPI · ${today} 수집 · 요금·시간 미확인",` +
      `sourceEn:"KTO TourAPI · fetched ${today} · fee and hours unverified",` +
      `kind:"${p.category.toUpperCase()}",walk:"medium"},`,
  )
  .join("\n")}
];

/** Coordinates + Hangul + romanization. Never translated away. */
export const ${cityId}GeneratedCoordinates = {
${rows
  .map((p) => `  "${p.id}":{lat:${p.lat},lng:${p.lng},city:"${p.city}",ko:"${p.ko}",en:"${p.en || p.ko}",rm:""},`)
  .join("\n")}
};
`,
  );

  written.push({ cityId, ko: region.ko, count: rows.length });
  grand += rows.length;
  console.log(`  ✓ ${cityId.padEnd(12)} ${String(rows.length).padStart(4)} places`);
}

/** The registry the app reads. Regenerated wholesale so a removed city vanishes. */
fs.writeFileSync(
  path.join(outDir, "generated.ts"),
  `// AUTO-GENERATED by scripts/ingest-from-bundle.mjs — do not edit by hand.
// Fetched ${today}. ${grand} places across ${written.length} regions.
import type { JourneyOption } from "../../lib/types";
${written.map((w) => `import { ${w.cityId}GeneratedOptions, ${w.cityId}GeneratedCoordinates } from "./${w.cityId}.generated";`).join("\n")}

export const GENERATED_CITIES: { id: string; ko: string; en: string; options: JourneyOption[] }[] = [
${written.map((w) => `  { id: "${w.cityId}", ko: "${w.ko}", en: "${w.cityId}", options: ${w.cityId}GeneratedOptions },`).join("\n")}
];

/** Every generated coordinate, merged. The map reads this. */
export const GENERATED_COORDINATES: Record<string, { lat: number; lng: number; city: string; ko: string; en: string; rm: string }> = {
${written.map((w) => `  ...${w.cityId}GeneratedCoordinates,`).join("\n")}
};
`,
);

console.log(`\n  ${grand} places across ${written.length} regions → ${outDir}/generated.ts\n`);
console.log(`  Next: npm run places:romanize  (rm is empty — it is what a driver reads)\n`);
