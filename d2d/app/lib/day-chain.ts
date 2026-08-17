import type { JourneyOption } from "./types";
import type { GeneratedPlan } from "./plan-generator";
import type { Theme } from "../components/TripSetup";
import { optionsForCities, cityLabel } from "../data/places";

/** English alone, for the line that is already sitting under the Korean one. */
const cityEnglish = (korean: string): string => cityLabel(korean).replace(korean, "").trim() || korean;

/**
 * A trip is one continuous chain, cut into days. Not a table of days.
 *
 * This is the conceptual correction. Every previous version of this screen
 * showed a trip as a GRID — day down the side, time across the top, each cell
 * a thing to do. A grid says the days are parallel and independent. They are
 * not. A trip is a single line: you are somewhere, you move, now you are
 * somewhere else, and tomorrow starts wherever tonight left you.
 *
 * So the model has exactly two kinds of thing:
 *
 *   NODE — a place you ARE. Home, the airport, a restaurant, the hotel.
 *          Nodes are DERIVED. The chain decides them; the traveler does not
 *          type them in.
 *
 *   MOVE — the step between two nodes, and the only place a DECISION lives.
 *          Every move asks the same three things, always in this order:
 *            when do you leave · how do you go · where does it put you
 *          That triple is the whole interaction model of the app. The old
 *          screen scattered those three questions across three tabs.
 *
 * Two consequences follow, and both are load-bearing:
 *
 *   1. DAYS ARE CUTS, NOT CONTAINERS. Day 2 opens on the same hotel node that
 *      closed day 1 — the same node, marked `carried`. A trip cannot have a
 *      gap, because there is no way to express one: the chain is a list.
 *
 *   2. THE CLOCK GENERATES THE PLAN, NOT THE OTHER WAY AROUND. Land at 10:00
 *      and check in at 15:00 and there are five hours nobody has planned;
 *      that gap is what produces the suggestion. Land at 22:00 and there is
 *      no gap, so there is no suggestion — the app stays quiet instead of
 *      recommending a palace that closed six hours ago.
 *
 * What this module will not do: invent a time. Flight times are the
 * traveler's to enter, and until they do, `clock` is null and the node says
 * what it is waiting for. A guessed 14:30 arrival would silently reshape
 * every suggestion below it.
 */

export type NodeKind =
  | "home"
  | "home-airport"
  | "korea-airport"
  | "stay"
  | "place"
  | "meal"
  | "station"
  | "home-again";

export type MoveMode = "walk" | "transit" | "taxi" | "rail" | "bus" | "air" | "car";

/** The step between two nodes — where every decision in this app lives. */
export type ChainMove = {
  /** Modes that make sense for this step. Never all seven. */
  modes: MoveMode[];
  /** Our planning estimate, in minutes. Null when we genuinely cannot say. */
  minutes: number | null;
  /** True when this step is a flight and its times are the traveler's to give. */
  needsTime: boolean;
  /**
   * Whether a booking link belongs on this step.
   *
   * Only the steps a traveler actually books ahead: the flights and the
   * intercity legs. A partner link on every subway ride is not monetisation,
   * it is a screen the eye learns to skip — and it buries the two links that
   * were worth something.
   */
  bookable: boolean;
};

export type ChainNode = {
  id: string;
  kind: NodeKind;
  ko: string;
  en: string;
  /** Minutes from midnight, or null while unknown. Never guessed. */
  clock: number | null;
  /** How you got here. The first node of the whole trip has none. */
  via: ChainMove | null;
  /**
   * This node closed yesterday and opens today. Rendered once, referenced
   * twice — the visual proof that a trip is continuous.
   */
  carried: boolean;
  /** The real place behind a `place` or `meal` node, when there is one. */
  option?: JourneyOption;
  /** Why this node is here at all, in the traveler's language. */
  reason?: "gap-before-checkin" | "gap-after-checkin" | "theme" | "fixed";
  city?: string;
};

export type ChainDay = {
  n: number;
  /** ISO date, or "" when the trip has no dates yet. */
  date: string;
  city: string;
  nodes: ChainNode[];
};

const HH = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const clockText = (m: number | null): string => (m === null ? "—" : HH(m));

const addDays = (iso: string, n: number): string => {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms + n * 86_400_000).toISOString().slice(0, 10);
};

/**
 * The arrival airport, named in both scripts.
 *
 * Not a city in the picker, so `cityLabel` has nothing to romanize for it —
 * and a node reading "인천공항 인천공항" would be the parallel-naming rule
 * applied without meaning it.
 */
export const DEFAULT_GATEWAY = { ko: "인천공항", en: "Incheon Airport" };

/** Standard Korean hotel check-in. Not a guess about the traveler — a fact about hotels. */
export const CHECK_IN = 15 * 60;

const move = (modes: MoveMode[], minutes: number | null, needsTime = false, bookable = false): ChainMove =>
  ({ modes, minutes, needsTime, bookable });

/**
 * What fits in a gap.
 *
 * The rule is subtraction, not ranking: a place whose stay plus transfer does
 * not fit in the minutes available is not a weaker suggestion, it is not a
 * suggestion. Everything that survives is then ordered by the traveler's
 * themes, so the gap gets filled with what they came for.
 */
export function fitsInGap(pool: JourneyOption[], minutes: number, themes: Theme[], want = 1): JourneyOption[] {
  if (minutes < 45) return [];
  const themed = new Set<string>(themes as string[]);
  return pool
    .filter((o) => o.stayMinutes + o.transferMinutes <= minutes)
    .sort((a, b) => Number(themed.has(b.category)) - Number(themed.has(a.category)))
    .slice(0, want);
}

/**
 * Build the whole chain.
 *
 * `arrival` and `departure` are minutes-from-midnight of the two flights. Pass
 * null for either and the chain still builds — it just stops claiming to know
 * what fits around them.
 */
export function buildChain(opts: {
  origin: string;
  plan: GeneratedPlan | undefined;
  departDate: string;
  themes: Theme[];
  /** Landing time at the Korean airport, in minutes from midnight. */
  arrival: number | null;
  /** Take-off time of the flight home. */
  departure: number | null;
  gateway?: { ko: string; en: string };
  /**
   * Places the traveler added from inside the trip, keyed by day number.
   *
   * These enter the same chain as everything the planner produced, and they
   * enter it LAST — after the derived stops — because a person standing in a
   * lobby at 19:40 is amending the evening, not rewriting the afternoon they
   * already spent. There is no separate "actual" chain to reconcile: an
   * improvised stop is a stop.
   */
  extras?: Record<number, JourneyOption[]>;
}): ChainDay[] {
  const { origin, plan, departDate, themes, arrival, departure } = opts;
  const extras = opts.extras ?? {};
  if (!plan || !plan.days.length) return [];

  const gateway = opts.gateway ?? DEFAULT_GATEWAY;
  const used = new Set<string>();
  const days: ChainDay[] = [];

  const stayNode = (city: string, day: number, carried: boolean, clock: number | null, via: ChainMove | null): ChainNode => ({
    id: `stay-${city}-${day}`,
    kind: "stay",
    ko: `${city} 숙소`,
    en: `Stay in ${cityEnglish(city)}`,
    clock,
    via,
    carried,
    city,
    reason: "fixed",
  });

  const placeNode = (o: JourneyOption, day: number, clock: number | null, via: ChainMove, reason: ChainNode["reason"]): ChainNode => {
    used.add(o.id);
    return {
      id: `${o.id}-d${day}`,
      kind: o.category === "food" ? "meal" : "place",
      ko: o.ko,
      en: o.en,
      clock,
      via,
      carried: false,
      option: o,
      reason,
      city: o.city,
    };
  };

  // ── Day 1 ───────────────────────────────────────────────────────────────
  // Home is the only node in the trip with nothing before it.
  const first = plan.days[0];
  const d1: ChainNode[] = [
    /**
     * The one node that is the traveler's own. It reads 집 / Financial
     * District, Hyderabad, India — neighbourhood, city, country, and nothing
     * finer. See OriginPicker for why the street is missing on purpose.
     */
    { id: "home", kind: "home", ko: "집", en: origin || "Home", clock: null, via: null, carried: false, reason: "fixed" },
    {
      id: "home-airport",
      kind: "home-airport",
      ko: "출발 공항",
      en: "Departure airport",
      clock: null,
      via: move(["taxi", "transit", "car"], 60),
      carried: false,
      reason: "fixed",
    },
    {
      id: "korea-airport",
      kind: "korea-airport",
      ko: gateway.ko,
      en: `${gateway.en} — arrival`,
      clock: arrival,
      via: move(["air"], null, true, true),
      carried: false,
      reason: "fixed",
    },
  ];

  // The gap between landing and check-in is the whole reason day 1 has a plan.
  const pool1 = optionsForCities([first.city]).filter((o) => !used.has(o.id));
  const toCity = move(["rail", "transit", "taxi"], 70);
  if (arrival !== null) {
    const gap = CHECK_IN - (arrival + 90); // immigration, bags, transfer
    for (const o of fitsInGap(pool1, gap, themes, 1)) {
      d1.push(placeNode(o, 1, arrival + 90, toCity, "gap-before-checkin"));
    }
  }

  d1.push(stayNode(first.city, 1, false, arrival === null ? null : Math.max(CHECK_IN, arrival + 150), toCity));

  // And the gap after check-in is why a 10:00 landing and a 22:00 landing are
  // different trips rather than the same list with different times on it.
  if (arrival !== null && arrival + 150 < CHECK_IN + 240) {
    const rest = optionsForCities([first.city]).filter((o) => !used.has(o.id));
    for (const o of fitsInGap(rest, 20 * 60 - Math.max(CHECK_IN, arrival + 150), themes, 1)) {
      d1.push(placeNode(o, 1, Math.max(CHECK_IN, arrival + 150) + 60, move(["walk", "transit"], 25), "gap-after-checkin"));
      d1.push(stayNode(first.city, 1, false, null, move(["walk", "transit", "taxi"], 25)));
    }
  }

  for (const o of extras[1] ?? []) {
    d1.push(placeNode(o, 1, null, move(["walk", "transit", "taxi"], o.transferMinutes || 20), "theme"));
    d1.push(stayNode(first.city, 1, false, null, move(["walk", "transit", "taxi"], 20)));
  }

  days.push({ n: 1, date: departDate, city: first.city, nodes: d1 });

  // ── Every day after ─────────────────────────────────────────────────────
  // Each one opens on the node that closed the day before. That is the model:
  // the chain is never cut, only marked.
  for (let i = 1; i < plan.days.length; i++) {
    const day = plan.days[i];
    const prev = plan.days[i - 1];
    const moved = prev.city !== day.city;
    const nodes: ChainNode[] = [stayNode(prev.city, i + 1, true, null, null)];

    if (moved) {
      nodes.push({
        id: `station-${prev.city}-${i}`,
        kind: "station",
        ko: `${prev.city}역`,
        en: `${cityEnglish(prev.city)} Station`,
        clock: 9 * 60,
        via: move(["transit", "taxi", "walk"], 25),
        carried: false,
        city: prev.city,
        reason: "fixed",
      });
      nodes.push({
        id: `station-${day.city}-${i}`,
        kind: "station",
        ko: `${day.city}역`,
        en: `${cityEnglish(day.city)} Station`,
        clock: null,
        via: move(["rail", "bus", "air", "car"], null, false, true),
        carried: false,
        city: day.city,
        reason: "fixed",
      });
    }

    let clock = moved ? 13 * 60 : 9 * 60 + 30;
    for (const o of day.stops.filter((s) => !used.has(s.id))) {
      nodes.push(placeNode(o, i + 1, clock, move(["walk", "transit", "taxi"], o.transferMinutes || 20), "theme"));
      clock += o.stayMinutes + o.transferMinutes;
      if (clock > 21 * 60) break;
    }

    for (const o of extras[i + 1] ?? []) {
      nodes.push(placeNode(o, i + 1, clock, move(["walk", "transit", "taxi"], o.transferMinutes || 20), "theme"));
      clock += o.stayMinutes + o.transferMinutes;
    }

    nodes.push(stayNode(day.city, i + 1, false, null, move(["transit", "taxi", "walk"], 25)));
    days.push({ n: i + 1, date: addDays(departDate, i), city: day.city, nodes });
  }

  // ── The flight home ─────────────────────────────────────────────────────
  const last = days[days.length - 1];
  last.nodes.push({
    id: "korea-airport-out",
    kind: "korea-airport",
    ko: gateway.ko,
    en: `${gateway.en} — departure`,
    clock: departure === null ? null : departure - 150,
    via: move(["rail", "transit", "taxi"], 70),
    carried: false,
    reason: "fixed",
  });
  last.nodes.push({
    id: "home-again",
    kind: "home-again",
    ko: origin || "집",
    en: origin || "Home",
    clock: null,
    via: move(["air"], null, true, true),
    carried: false,
    reason: "fixed",
  });

  return days;
}

/** Every decision still open, counted. A plan is finished when this is zero. */
export const openDecisions = (days: ChainDay[]): number =>
  days.reduce((n, d) => n + d.nodes.filter((x) => x.via && (x.via.needsTime || x.clock === null)).length, 0);
