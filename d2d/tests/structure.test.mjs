import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const APP = new URL("../app/", import.meta.url).pathname;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.tsx?$/.test(e.name) ? [p] : [];
  });
}
const files = walk(APP);
const read = (f) => fs.readFileSync(f, "utf8");

/**
 * The original bug: view components were declared INSIDE Home(). A component
 * declared during a render gets a new function identity every update, so React
 * treats it as a different component type, unmounts the old subtree and mounts
 * a new one — losing input focus and scroll position mid-keystroke. Typing
 * Hangul made this obvious because each syllable is several compositions.
 *
 * This test guards the structure, not the symptom.
 */
test("no component is declared inside another component", () => {
  const offenders = [];
  for (const file of files) {
    read(file)
      .split("\n")
      .forEach((line, i) => {
        // an indented `const Foo = () =>` whose name is PascalCase
        const m = line.match(/^\s+const ([A-Z]\w*)\s*=\s*\(\s*\)\s*=>/);
        if (m) offenders.push(`${path.relative(APP, file)}:${i + 1} ${m[1]}`);
      });
  }
  assert.deepEqual(offenders, [], `components declared inside a render:\n${offenders.join("\n")}`);
});

test("view screens are top-level default exports", () => {
  for (const name of ["LiveView", "PlanView", "BuildView", "SavedView"]) {
    const file = path.join(APP, "views", `${name}.tsx`);
    assert.ok(fs.existsSync(file), `${name}.tsx is missing`);
    assert.match(read(file), new RegExp(`export default function ${name}\\(`), `${name} must be top level`);
  }
});

test("state lives in one container, not in the page", () => {
  const page = read(path.join(APP, "page.tsx"));
  assert.ok(!/useState/.test(page), "page.tsx should hold no state of its own");
  assert.match(page, /TripProvider/, "page.tsx should mount the state container");
});

test("the map is not hardwired to one Korean city", () => {
  // The prototype shipped Gyeongju as if it were the product. Every place this
  // crept back in was invisible: a Busan route simply had nothing to zoom to.
  const map = fs.readFileSync("app/components/BuildRouteMap.tsx", "utf8");
  const types = fs.readFileSync("app/lib/types.ts", "utf8");
  assert.ok(!/"gyeongju"/.test(map), "BuildRouteMap must not name a city");
  assert.match(types, /BuildMapScope = "city" \| "korea"/);
  // Falling back to a city centre when nothing is placed is the same bug.
  assert.ok(!/129\.2\d/.test(map), "the empty-state view must not centre on Gyeongju");
});

test("stops without coordinates are reported, not dropped", () => {
  const map = fs.readFileSync("app/components/BuildRouteMap.tsx", "utf8");
  assert.match(map, /const missing\s*=/);
  assert.match(map, /0_stops_have_no_coordinates/);
});

test("ingested coordinates are actually read by the app", () => {
  // seoulGeneratedCoordinates existed for days and nothing imported it, so
  // every TourAPI place was missing from the map.
  const places = fs.readFileSync("app/data/places/index.ts", "utf8");
  const route = fs.readFileSync("app/data/route-coordinates.ts", "utf8");
  assert.match(places, /GENERATED_COORDINATES/);
  assert.match(places, /export const coordinateFor/);
  assert.match(route, /coordinateFor\(key\)/);
});

test("the traveler's own door is not counted as missing map data", () => {
  // HOME_ADDRESS_RULE keeps home addresses off third-party maps. Reporting
  // that as a coordinate gap would make the warning permanent and meaningless.
  const map = fs.readFileSync("app/components/BuildRouteMap.tsx", "utf8");
  assert.match(map, /kind!=="HOME"&&i\.stop\.kind!=="RETURN"/);
});

test("city coverage is decided by the data, not a hardcoded list", () => {
  // The provider used to carry {서울, 경주, 부산} inline, so every other city
  // was reported as empty even after the national ingest filled it.
  const prov = fs.readFileSync("app/lib/place-provider.ts", "utf8");
  assert.ok(!/서울: "seoul"/.test(prov), "the provider must not hardcode which cities exist");
  assert.match(prov, /missing: citiesWithoutData\(cities\)/);
});

test("plans are generated from real places, not fixtures", () => {
  const view = fs.readFileSync("app/views/PlanView.tsx", "utf8");
  assert.ok(!/samplePlans\.map/.test(view), "the results grid must not render fixture plans");
  assert.match(view, /generatedPlans\.map/);
});

test("a plan never shows a total it cannot justify", () => {
  // Every fixture carried a to-the-won total for a trip nobody had priced.
  const view = fs.readFileSync("app/views/PlanView.tsx", "utf8");
  const grid = view.slice(view.indexOf('className="plans-grid"'), view.indexOf("plan-unpriced"));
  assert.ok(!/formatWon/.test(grid), "no money may appear on a plan card until it is real");
  assert.match(view, /no_published_fees_yet/);
});

test("cost lines are not fed from fixture figures", () => {
  const ctx = fs.readFileSync("app/state/TripContext.tsx", "utf8");
  for (const f of ["selectedPlanData.air", "selectedPlanData.stay", "selectedPlanData.food"]) {
    assert.ok(!ctx.includes(f), `${f} must not reach the cost model`);
  }
});

test("clinics and hospitals stay out of the place pool", () => {
  // The English catalogue files them under the same contentTypeId as palaces,
  // so without a filter a day plan offers an eye clinic as a heritage stop.
  const files = fs.readdirSync("app/data/places").filter((f) => f.endsWith(".generated.ts"));
  const medical = /(의원"|병원"|클리닉|성형외과|피부과|치과|안과|한의원)/;
  const offenders = [];
  for (const f of files) {
    const s = fs.readFileSync(`app/data/places/${f}`, "utf8");
    for (const m of s.matchAll(/ko:"([^"]*)"/g)) if (medical.test(m[1] + '"')) offenders.push(`${f}: ${m[1]}`);
  }
  assert.deepEqual(offenders.slice(0, 5), [], `medical facilities in the place pool: ${offenders.length}`);
  assert.match(fs.readFileSync("scripts/ingest-from-bundle.mjs", "utf8"), /const MEDICAL =/);
});

test("no screen asserts a city the traveler did not choose", () => {
  // "Seoul → Gyeongju" and "Day 2 · Family of 4" were literals in the
  // dictionary, so everyone was told they were going to Gyeongju. Headline
  // copy must be derived from the trip, never asserted.
  const en = fs.readFileSync("app/i18n/en.ts", "utf8");
  const headline = /^\s*copy_(trip|day)\s*:/m;
  assert.ok(!headline.test(en), "the live heading must not be a fixed string");
  const live = fs.readFileSync("app/views/LiveView.tsx", "utf8");
  assert.match(live, /<TripHeading/, "the live heading must be the derived component");
});

/**
 * ── The chain ────────────────────────────────────────────────────────────
 *
 * These guard the conceptual claims, not the pixels. Each one is a thing that
 * was wrong in a previous version of this screen and would be invisible in a
 * screenshot.
 */

test("a trip is one chain, so a day opens on the node the last one closed", () => {
  // The failure this prevents: rendering days as independent lists, which
  // lets day 3 start in a city day 2 never travelled to.
  const s = read(path.join(APP, "lib/day-chain.ts"));
  assert.match(s, /carried/, "the chain must mark the node carried over from yesterday");
  assert.match(s, /stayNode\(prev\.city, i \+ 1, true/,
    "each day after the first must open on the PREVIOUS day's stay");
});

test("no clock is invented — an unknown time stays null all the way to the screen", () => {
  const chain = read(path.join(APP, "lib/day-chain.ts"));
  const view = read(path.join(APP, "components/DayChain.tsx"));
  // Suggestions around the landing must be gated on a real arrival time.
  assert.match(chain, /if \(arrival !== null\)/,
    "day 1 suggestions must be gated on the traveler's actual landing time");
  assert.match(view, /clockText\(node\.clock\)/, "the node must render the clock through the null-safe formatter");
  assert.ok(/m === null \? "—"/.test(chain), "an unknown time must render as a dash, never as a plausible hour");
});

test("open-now is three-state, and unverified hours are never sorted away", () => {
  // 1,567 of our places say "Hours need checking". An app that ranked by
  // "open now" would be ranking mostly on an assumption.
  assert.match(read(path.join(APP, "lib/hours.ts")), /export type OpenState = true \| false \| null/);
  assert.match(read(path.join(APP, "lib/right-now.ts")), /state !== false/,
    "unknown hours must not disqualify a place — only a known closure does");
  const view = read(path.join(APP, "components/RightNow.tsx"));
  assert.match(view, /hours_unverified_check_before_you_go/,
    "an unverified place must say so on its own row, not in a footnote alone");
});

test("improvising edits the plan — there is no second itinerary to reconcile", () => {
  const chain = read(path.join(APP, "lib/day-chain.ts"));
  assert.match(chain, /extras\?: Record<number, JourneyOption\[\]>/,
    "places added mid-trip must enter the same chain the planner built");
  const ctx = read(path.join(APP, "state/TripContext.tsx"));
  assert.ok(!/actualItinerary|plannedVsActual/.test(ctx),
    "there must be no parallel 'actual' itinerary — improvising is amending");
  assert.match(ctx, /addToToday/, "the live tab must be able to add into today");
});

test("the chain and the live tab name no city of their own", () => {
  // Same rule as every other screen: Gyeongju was hardcoded three times.
  for (const f of ["lib/day-chain.ts", "lib/right-now.ts", "components/RightNow.tsx", "components/DayChain.tsx"]) {
    const s = read(path.join(APP, f));
    const named = s.match(/["'](서울|경주|부산|Seoul|Gyeongju|Busan)["']/g) ?? [];
    assert.deepEqual(named, [], `${f} must not name a city: ${named.join(", ")}`);
  }
});

test("every step of the chain is offered in Korean and English together", () => {
  const view = read(path.join(APP, "components/DayChain.tsx"));
  assert.match(view, /<strong>\{node\.ko\}<\/strong>/, "the Korean name is what a traveler shows a driver");
  assert.match(view, /o\?\.en \?\? node\.en/, "the English name is what they read themselves");
});

test("a weekly closing day outranks the opening hours", async () => {
  // "11:00-19:00 · Closed: Mondays" read as a range alone tells a traveler
  // standing outside on a Monday afternoon that the museum is open.
  const { openAt } = await import("../app/lib/hours.ts");
  const MON = 1, TUE = 2;
  assert.equal(openAt("11:00-19:00 · Closed: Mondays", 14 * 60, MON), false);
  assert.equal(openAt("11:00-19:00 · Closed: Mondays", 14 * 60, TUE), true);
  // A closure we cannot parse is unknown, never "open".
  assert.equal(openAt("09:00-18:00 · Closed: the first Wednesday of each month", 12 * 60, TUE), null);
  assert.equal(openAt("Hours need checking", 12 * 60, TUE), null);
  assert.equal(openAt("Varies by store · Closed: Varies by store", 12 * 60, TUE), null);
  // "Open all year round" is a closure clause that closes nothing.
  assert.equal(openAt("09:00-18:00 · Closed: N/A (Open all year round)", 12 * 60, MON), true);
  // Arriving five minutes before the doors shut is not "open".
  assert.equal(openAt("09:00-18:00 · Closed: N/A (Open all year round)", 17 * 60 + 50, MON), false);
});

test("the live list never claims a distance it does not have", () => {
  const s = read(path.join(APP, "lib/right-now.ts"));
  assert.ok(!/\bkm\b|distance|nearest|nearby/i.test(s.replace(/\/\*[\s\S]*?\*\//g, "")),
    "we have no coordinates for most places — the list must not imply proximity");
});
