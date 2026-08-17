import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const APP = new URL("../app/", import.meta.url).pathname;
const read = (p) => fs.readFileSync(path.join(APP, p), "utf8");

/**
 * 실제 확인된 정보와 AI 추정치를 절대 섞어 표시하지 않는다.
 *
 * This is the product's core promise, so it gets a test rather than a comment.
 */

test("every place row declares where its facts came from", () => {
  const dir = path.join(APP, "data/places");
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".ts") && n !== "index.ts" && n !== "generated.ts")) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    const rows = src.match(/\{city:"/g)?.length ?? 0;
    const sourced = src.match(/sourceKo:"/g)?.length ?? 0;
    assert.equal(sourced, rows, `${f}: ${rows} rows but ${sourced} carry a source`);
  }
});

test("a place is only 공식 when a checked date is attached", () => {
  const dir = path.join(APP, "data/places");
  const offenders = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
    for (const [, source] of fs.readFileSync(path.join(dir, f), "utf8").matchAll(/sourceKo:"([^"]*)"/g)) {
      // "공식 가격 아님" and "공식 페이지 미대조" are DENIALS of officialness.
      // A naive /공식/ match reads them backwards.
      const denies = /아님|아닙니다|미대조|미확인|확인 필요/.test(source);
      const claimsOfficial = !denies && /공식|detailIntro2/.test(source);
      const hasDate = /\d{4}[-.]\d{2}[-.]\d{2}|\d{4}\.\d{2}\.\d{2}/.test(source);
      if (claimsOfficial && !hasDate) offenders.push(`${f}: ${source.slice(0, 60)}`);
    }
  }
  assert.deepEqual(offenders, [], `공식 without a checked date:\n${offenders.join("\n")}`);
});

test("time and cost are never labelled official", () => {
  const p = read("lib/provenance.ts");
  assert.match(p, /timeAndCostProvenance[\s\S]*?"estimate"/,
    "dwell time and budgets must always resolve to estimate");
});

test("blank hours are not treated as open", () => {
  const s = fs.readFileSync(new URL("../scripts/enrich-hours.mjs", import.meta.url), "utf8");
  assert.match(s, /if \(!usetime && !restdate\) \{ blank\+\+; continue; \}/,
    "a place with no published hours must be skipped, not promoted");
});

test("official hours never claim more than the source gave", () => {
  // detailIntro2 answers in English only, from a catalogue with its own
  // contentid space. Writing that text into hoursKo would be a translation
  // nobody made, so the Korean field stays unverified.
  for (const f of fs.readdirSync("app/data/places").filter((x) => x.endsWith(".generated.ts"))) {
    const s = fs.readFileSync(`app/data/places/${f}`, "utf8");
    for (const line of s.split("\n")) {
      if (!/sourceEn:"KTO TourAPI detailIntro2/.test(line)) continue;
      assert.match(line, /hoursKo:"운영시간 확인 필요"/,
        `${f}: an English-sourced row must not claim Korean hours`);
      assert.match(line, /sourceKo:"[^"]*영문 기준 공식"/,
        `${f}: the Korean source line must say the figure is English-sourced`);
    }
  }
});
