#!/usr/bin/env node
/**
 * Promote hours and fees from "확인 필요" to official, one record at a time.
 *
 *   node scripts/apply-hours.mjs ~/Downloads/tourapi-hours-2026-08-17.json
 *
 * Promotion is PER RECORD, never per file. detailIntro2 answers for some
 * places and not others: of 1,027 asked, 805 came back with something and 222
 * came back empty. Marking the whole file official because most of it is would
 * put "공식" on 222 rows that nobody checked — which is precisely the failure
 * the provenance rules exist to prevent.
 *
 * A record is promoted only when the API returned an actual opening time, a
 * closing day, or a fee. Anything else keeps its "확인 필요" label and its
 * unverified source line.
 *
 * The hours are ENGLISH, from EngService2. `hoursKo` is deliberately left
 * alone: the Korean catalogue has its own contentid space, so a Korean string
 * would have to be fetched separately and joined. Writing the English text
 * into the Korean field would be a translation we did not make.
 */

import fs from "node:fs";
import path from "node:path";

const src = process.argv[2];
if (!src) {
  console.error("\n  usage: node scripts/apply-hours.mjs <hours.json>\n");
  process.exit(1);
}

const hours = JSON.parse(fs.readFileSync(src, "utf8"));
const today = "2026-08-17";
const esc = (s = "") => String(s).replace(/"/g, "'").replace(/\s+/g, " ").trim().slice(0, 220);

let promoted = 0, feeSet = 0, untouched = 0;

for (const file of fs.readdirSync("app/data/places").filter((f) => f.endsWith(".generated.ts"))) {
  const full = path.join("app/data/places", file);
  const out = fs.readFileSync(full, "utf8").split("\n").map((line) => {
    const m = line.match(/^  \{city:"[^"]*",id:"([^"]+)"/);
    if (!m) return line;
    const rec = hours[m[1]];
    if (!rec) { untouched++; return line; }

    const text = esc([rec.hours, rec.rest && `Closed: ${rec.rest}`].filter(Boolean).join(" · "));
    if (!text && !rec.fee) { untouched++; return line; }

    let next = line;
    if (text) {
      next = next
        .replace(/hoursEn:"[^"]*"/, `hoursEn:"${text}"`)
        .replace(/sourceEn:"[^"]*"/, `sourceEn:"KTO TourAPI detailIntro2 · checked ${today} · official"`)
        // The Korean source line must not claim official for an English figure.
        .replace(/sourceKo:"[^"]*"/, `sourceKo:"한국관광공사 TourAPI detailIntro2 · ${today} 확인 · 영문 기준 공식"`);
      promoted++;
    }
    if (rec.fee) {
      next = next.replace(/costEn:"[^"]*"/, `costEn:"${esc(rec.fee)}"`);
      feeSet++;
    }
    return next;
  });
  fs.writeFileSync(full, out.join("\n"));
}

console.log(`
  ${String(promoted).padStart(4)}  hours promoted to official (dated ${today})
  ${String(feeSet).padStart(4)}  fees filled from the API
  ${String(untouched).padStart(4)}  left as 확인 필요 — the API had nothing for them
`);
