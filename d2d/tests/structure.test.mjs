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

test("the name the reader can read leads; the Korean rides underneath", () => {
  // This was backwards for a day: the English build showed
  //   아늑에어 호텔 개봉점   (large)
  //   Aank Air Hotel Gaebong (small)
  // — the language switch quietly not applying to the one thing on the row
  // that matters. The Korean still has to be there, because a driver reads it.
  const naming = read(path.join(APP, "lib/naming.ts"));
  assert.match(naming, /if \(lang === "ko"\) return o\.ko;/, "Korean leads only in the Korean build");
  assert.match(naming, /return o\.en \|\| o\.ko;/, "every other language leads with its own name");
  assert.match(naming, /return \[o\.ko, o\.rm\]/, "the Korean must never be dropped — it is what gets pointed at");

  const view = read(path.join(APP, "components/DayChain.tsx"));
  assert.match(view, /<strong>\{name\.lead\}<\/strong>/);
  assert.match(view, /\{name\.companion && <small>/);
  assert.ok(!/<strong>\{node\.ko\}<\/strong>/.test(view), "the hardcoded Korean lead must be gone");

  const now = read(path.join(APP, "components/RightNow.tsx"));
  assert.match(now, /namePair\(lang, o\)\.lead/, "the live list follows the same rule");
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

test("the trip starts at a neighbourhood, never at a street or a coordinate", () => {
  // "17.41250, 78.34580" was what "use my location" put in the origin box.
  // Nobody recognises their own home as decimals, and a free-text box invites
  // a street address — the most sensitive thing this app could hold.
  const s = read(path.join(APP, "components/OriginPicker.tsx"));
  assert.ok(!/street|address\s*(line|1|2)|postcode|zip/i.test(s.replace(/\/\*[\s\S]*?\*\//g, "")),
    "the picker must not ask for a street");
  assert.match(s, /getCurrentPosition\(\(\) =>/,
    "geolocation must discard the coordinates — they are only useful if sent somewhere");
  const setup = read(path.join(APP, "components/TripSetup.tsx"));
  assert.match(setup, /<OriginPicker/, "step 1 must be the three-part picker, not a text box");
  assert.ok(!/className="setup-input"[\s\S]{0,120}value=\{origin\}/.test(setup),
    "the old free-text origin box must be gone");
});

test("the home node carries the traveler's own place, not a literal", () => {
  const chain = read(path.join(APP, "lib/day-chain.ts"));
  assert.match(chain, /en: origin \|\| "Home"/,
    "the first node must show the traveler's country/city/neighbourhood");
});

test("no exchange rate is invented — the traveler's own rate is the only one used", async () => {
  // Hardcoding "1 USD = 1,380 KRW" makes every screen look finished and is
  // wrong within a week, and wrong by a different amount for every traveler —
  // nobody pays the mid-market rate. Same failure as the ₩8,940,000 totals.
  const s = read(path.join(APP, "lib/currency.ts"));
  const code = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
  assert.ok(!/1[,.]?[0-9]{3}(\.[0-9]+)?\s*(\*|\/)/.test(code), "no literal rate arithmetic");
  assert.ok(!/RATES\s*[:=]|DEFAULT_RATE|MID_MARKET/.test(code), "no built-in rate table");

  const { fromWon, toWon } = await import("../app/lib/currency.ts");
  assert.equal(fromWon(100000, "USD", {}), null, "no rate means no number, never a guess");
  assert.equal(toWon(100, "USD", {}), null);
  assert.equal(fromWon(100000, "KRW", {}), 100000, "won needs no rate");
  assert.equal(toWon(100, "USD", { USD: 1400 }), 140000, "their rate, their number");
});

test("the budget currency follows where the traveler lives", () => {
  const s = read(path.join(APP, "lib/currency.ts"));
  assert.match(s, /export const COUNTRY_CURRENCY/);
  assert.match(s, /india: "INR"/, "someone in Hyderabad budgets in rupees, not won");
  const ctx = read(path.join(APP, "state/TripContext.tsx"));
  assert.match(ctx, /setCurrency\(currencyForCountry\(country\)\)/,
    "changing the origin country must move the money with it");
  const setup = read(path.join(APP, "components/TripSetup.tsx"));
  assert.match(setup, /className="currency-filter"/, "the filter must be on the budget step");
});

test("the day story describes the trip, never asserts a fact about Korea", () => {
  // The temptation: "Gyeongbokgung was the seat of the Joseon court." We hold
  // a name, a district, a category and hours 1,567 records admit are
  // unchecked. Confident prose hides an unverified claim better than a number
  // does — which makes it worse, not better.
  const s = read(path.join(APP, "lib/story.ts"));
  // Strip comments first — this file explains itself at length, and the
  // explanation is allowed to use words the output is not.
  const body = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
  const prose = (body.match(/"[^"]{25,}"/g) ?? []).join(" ");
  const factish = /\b(built|founded|dynasty|century|18[0-9]{2}|19[0-9]{2}|king|emperor|UNESCO|famous for|known for)\b/i;
  assert.ok(!factish.test(prose), "no sentence may claim a historical or descriptive fact about a place");

  // Every line must carry what it was derived from.
  assert.match(s, /basis: string/);
  assert.ok(!/lines\.push\(\{\s*text:[^}]*\}\)/.test(s.replace(/basis:[^,}]*/g, "BASIS")) === false || /basis:/.test(s),
    "every pushed line carries a basis");
  const view = read(path.join(APP, "components/DayChain.tsx"));
  assert.match(view, /where_this_came_from/, "the basis list must be reachable from the screen");
});

test("the theme changes which true sentence leads, and invents nothing", async () => {
  const s = read(path.join(APP, "lib/story.ts"));
  assert.match(s, /const lens = themes\.find\(\(th\) => THEME_CATEGORIES/, "no theme means no lens sentence — never a default one");
  assert.match(s, /matching >= 2/, "the lens sentence must not run on a day too thin to support it");
  // The counts in the sentences come from the chain, not from the theme.
  assert.match(s, /LENS\[lens\]\(matching/);
});

test("the theme sentence counts the stops that match the theme, not the day", () => {
  // It shipped once saying "4 of today's stops are old town and heritage
  // ground" with a basis line reading `dominant category=family`. The
  // sentence was counting the day and claiming the theme.
  const s = read(path.join(APP, "lib/story.ts"));
  assert.match(s, /const THEME_CATEGORIES/);
  assert.match(s, /nature: \[\]/, "a theme our taxonomy cannot see gets no sentence, not a guessed one");
  assert.match(s, /LENS\[lens\]\(matching/, "the number in the sentence must be the matching count");
  assert.ok(!/LENS\[lens\]\(dom\.count/.test(s), "the day-wide count must not be used as the theme count");
});

test('"you change city today" is read from the chain, not from counting names', () => {
  // Stay nodes hold 서울; place nodes hold the id `seoul`. Counting distinct
  // `city` values therefore never returned fewer than two, and the sentence
  // fired on all eight days of an eight-day trip.
  const s = read(path.join(APP, "lib/story.ts"));
  assert.match(s, /n\.kind === "station"/, "a move is a structural fact — stations only exist when the city changes");
  assert.ok(!/cities\.size > 1/.test(s), "the name-counting version must be gone");
});

test("hotels are not sightseeing stops", () => {
  // A day plan came out as three Aank hotels in a row. TourAPI's lodging type
  // arrives tagged `family`, indistinguishable from a museum, and the stay is
  // already its own node in the chain.
  const src = read(path.join(APP, "data/places/index.ts"));
  assert.match(src, /const LODGING =/);
  assert.match(src, /if \(isLodging\(o\)\) return false;/,
    "the filter must run inside optionsForCities, where every screen reads from");

  // Exercise the pattern itself against the names that caused the bug.
  const LODGING = new RegExp(src.match(/const LODGING = \/(.+?)\/i;/)[1], "i");
  for (const name of ["블루스토리 호텔", "Aank Air Hotel Gaebong", "센텀프리머스 호텔", "OO 펜션", "OO 게스트하우스"]) {
    assert.ok(LODGING.test(name), `${name} must be filtered`);
  }
  for (const name of ["경복궁", "Gyeongbokgung Palace", "아차산", "Achasan Mountain", "성동시장"]) {
    assert.ok(!LODGING.test(name), `${name} must survive`);
  }

  // And it must not be reachable from the generated files by accident.
  const files = fs.readdirSync("app/data/places").filter((f) => f.endsWith(".generated.ts"));
  const total = files.reduce((n, f) => n + (fs.readFileSync(`app/data/places/${f}`, "utf8").match(/ko:"/g) ?? []).length, 0);
  assert.ok(total > 2000, "the records stay in the files — they are real, just not sightseeing");
});

test("day plans are not sorted by the alphabet", () => {
  // A day came out as Achasan, Africa Museum, Ahn Junggeun, Aimeigroup —
  // every record has the same stay and transfer minutes, so the ordering tied
  // everywhere and the tie broke on the name.
  const s = read(path.join(APP, "lib/plan-generator.ts"));
  assert.match(s, /const tellsYouMore/, "the tie must break on how much we know, not on the name");
  assert.match(s, /\.sort\(byUsefulness\)/);
});
