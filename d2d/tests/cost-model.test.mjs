import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const src = fs.readFileSync(new URL("../app/lib/cost-model.ts", import.meta.url), "utf8");

/**
 * The budget is the product. These tests guard the two ways a budget lies:
 * pretending it knows something it doesn't, and hiding a leg entirely.
 */

test("the two door legs have their own cost lines", () => {
  for (const id of ["home-to-airport", "airport-to-home", "airport-parking"]) {
    assert.match(src, new RegExp(`id: "${id}"`), `${id} must be a cost line of its own`);
  }
});

test("an unknown amount is null, never zero", () => {
  assert.match(src, /amount: number \| null/, "amount must be nullable");
  assert.match(src, /return \{ amount: null, provenance: "needs-check" \}/,
    "an uncomputable leg returns null, because 0 reads as free");
});

test("the total admits when it is incomplete", () => {
  assert.match(src, /incomplete: unknown\.length > 0/,
    "a total with missing lines must flag itself");
  assert.match(src, /unknownLines/, "the missing lines must be nameable, not just counted");
});

test("airport parking scales with trip length, not distance", () => {
  assert.match(src, /parkingDays\(input\.departISO, input\.returnISO\)/,
    "parking is nights-driven — an 8-night trip parks 9 days");
});

test("the headline total comes from the cost model, not the sample plan", () => {
  const view = fs.readFileSync(new URL("../app/views/PlanView.tsx", import.meta.url), "utf8");
  assert.match(view, /detail-total[\s\S]{0,120}formatWon\(costTotals\.total\)/,
    "the headline must sum the same lines the table shows");
  assert.doesNotMatch(view, /detail-total[\s\S]{0,120}selectedPlanData\.total/,
    "a headline that ignores the door legs contradicts its own table");
});
