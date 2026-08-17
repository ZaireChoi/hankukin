import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const src = fs.readFileSync(new URL("../app/data/journey-legs.ts", import.meta.url), "utf8");
const ui  = fs.readFileSync(new URL("../app/components/ItineraryEditor.tsx", import.meta.url), "utf8");

/**
 * A journey is not always seven legs. Open-jaw, stopovers, re-entry, ferries
 * and one-way moves all break a fixed shape, so the shape must be editable.
 */

test("the itinerary is a list, not a fixed structure", () => {
  assert.match(src, /export function defaultItinerary\(\): JourneyLeg\[\]/,
    "seven legs must be a template function, not a constant the app depends on");
  assert.match(src, /export const newLeg/, "the traveler must be able to add legs");
});

test("every non-door leg kind is repeatable", () => {
  // one home, but any number of flights, ferries, transfers and stays
  const repeatables = [...src.matchAll(/kind: "(\w[\w-]*)", repeatable: (true|false)/g)]
    .map(([, kind, rep]) => [kind, rep === "true"]);
  const byKind = Object.fromEntries(repeatables);
  assert.equal(byKind.door, false, "a traveler has one home");
  for (const k of ["ground", "air-intl", "air-domestic", "sea", "rail-intl", "stay"]) {
    assert.equal(byKind[k], true, `${k} must be addable more than once`);
  }
});

test("one-way journeys are reported, not forbidden", () => {
  assert.match(src, /export function validate/, "validation must exist");
  assert.doesNotMatch(src, /throw new Error\(["'`]one[- ]way/i,
    "a one-way trip is a real journey and must not be rejected");
  assert.match(src, /isRoundTrip/, "round trip vs one way must be distinguishable");
});

test("door legs resist deletion but the rest do not", () => {
  assert.match(src, /locked: true/, "door legs are kept");
  assert.match(ui, /leg\.locked \?/, "the editor must hide delete on locked legs only");
  assert.match(ui, /const remove =/, "every other leg is removable");
});

test("border crossings are counted from the list", () => {
  assert.match(src, /borderCrossings/,
    "visa prompts depend on how many borders the edited journey actually crosses");
});
