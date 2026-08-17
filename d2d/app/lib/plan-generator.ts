import type { JourneyOption } from "./types";
import type { Lang } from "../i18n";
import { optionsForCities, cityLabel } from "../data/places";

/**
 * Build plans from the traveler's own cities and the real place registry.
 *
 * The ten plans this replaces were fixtures. They named Seoul, Gyeongju and
 * Busan whatever you picked, and every one of them carried a total to the won —
 * ₩8,940,000, ₩7,320,000 — for a trip nobody had priced. Those numbers were
 * the most confident thing on the screen and the least true.
 *
 * What this module will and will not claim:
 *
 *   IT DERIVES     the city order, how the nights split, which real places
 *                  fill each day, how far the walking is, how many times the
 *                  traveler changes hotel. All of it follows from data.
 *
 *   IT ESTIMATES   dwell and transfer minutes, and says so — those are our
 *                  planning defaults, exactly as the option rows already mark
 *                  them.
 *
 *   IT REFUSES     to total a trip it cannot price. The ingested places carry
 *                  "요금 확인 필요", so a plan's cost is `null` until the cost
 *                  model has something real. A blank is honest; ₩8,940,000 was
 *                  not.
 *
 * The variants differ by STRATEGY, not by decoration. Each one is a different
 * answer to the same question — where do you sleep, and what do you give up —
 * so a traveler comparing them is comparing something real.
 */

export type PlanStrategyId =
  | "split-stay"
  | "single-hub"
  | "region-first"
  | "heritage"
  | "food-market"
  | "fewest-moves";

export type PlanStrategy = {
  id: PlanStrategyId;
  /** What this plan optimises for, and what it costs you. Both, always. */
  labels: Record<Lang, { tag: string; title: string; gives: string; costs: string }>;
  /** Categories pulled forward when filling days. */
  favours: JourneyOption["category"][];
  /** How nights are distributed across the chosen cities. */
  nights: (cities: number, total: number) => number[];
};

const L = <T,>(en: T, ko: T, ja: T, zhHans: T, zhHant: T): Record<Lang, T> =>
  ({ en, ko, ja, "zh-Hans": zhHans, "zh-Hant": zhHant });

/** Even split, remainder to the first cities — where flights land. */
const even = (cities: number, total: number): number[] => {
  const base = Math.floor(total / cities);
  const extra = total - base * cities;
  return Array.from({ length: cities }, (_, i) => base + (i < extra ? 1 : 0));
};

/** Everything in the first city; the rest are day trips, so zero nights. */
const hub = (cities: number, total: number): number[] =>
  Array.from({ length: cities }, (_, i) => (i === 0 ? total : 0));

/** Weight the later cities — the point of going is the region, not the gateway. */
const backloaded = (cities: number, total: number): number[] => {
  if (cities === 1) return [total];
  const first = Math.max(1, Math.floor(total * 0.2));
  return [first, ...even(cities - 1, total - first)];
};

export const STRATEGIES: PlanStrategy[] = [
  {
    id: "split-stay",
    favours: ["heritage", "food", "family"],
    nights: even,
    labels: L(
      { tag: "BALANCED", title: "A stay in each city", gives: "Full days in every city", costs: "You pack and move each time" },
      { tag: "균형", title: "도시마다 숙소 하나", gives: "각 도시에서 온전한 하루", costs: "그때마다 짐을 싸서 옮깁니다" },
      { tag: "バランス", title: "都市ごとに宿を取る", gives: "各都市で丸一日", costs: "その都度荷造りして移動します" },
      { tag: "均衡", title: "每个城市各住一处", gives: "每座城市都有完整的一天", costs: "每次都要收拾行李搬家" },
      { tag: "均衡", title: "每個城市各住一處", gives: "每座城市都有完整的一天", costs: "每次都要收拾行李搬家" },
    ),
  },
  {
    id: "single-hub",
    favours: ["heritage", "shopping", "food"],
    nights: hub,
    labels: L(
      { tag: "ONE BASE", title: "One hotel, day trips out", gives: "Unpack once, no checkout mornings", costs: "Long return journeys most days" },
      { tag: "거점형", title: "숙소 하나, 당일치기", gives: "한 번만 풀면 됩니다", costs: "대부분의 날에 왕복 이동이 깁니다" },
      { tag: "拠点型", title: "宿は一つ、日帰りで回る", gives: "荷ほどきは一度だけ", costs: "多くの日で往復移動が長くなります" },
      { tag: "单一据点", title: "一间酒店，当天往返", gives: "只需整理一次行李", costs: "多数日子往返路程较长" },
      { tag: "單一據點", title: "一間飯店，當天往返", gives: "只需整理一次行李", costs: "多數日子往返路程較長" },
    ),
  },
  {
    id: "region-first",
    favours: ["heritage", "family", "food"],
    nights: backloaded,
    labels: L(
      { tag: "REGION FIRST", title: "Straight out of the gateway city", gives: "Most of the trip outside the capital", costs: "A long transfer on arrival day" },
      { tag: "지방 우선", title: "도착하자마자 지방으로", gives: "여행의 대부분을 지방에서", costs: "도착 당일 이동이 깁니다" },
      { tag: "地方優先", title: "到着後すぐ地方へ", gives: "旅の大半を地方で過ごせます", costs: "到着日の移動が長くなります" },
      { tag: "地方优先", title: "抵达后直接前往地方", gives: "行程大部分在地方城市", costs: "抵达当天需长途移动" },
      { tag: "地方優先", title: "抵達後直接前往地方", gives: "行程大部分在地方城市", costs: "抵達當天需長途移動" },
    ),
  },
  {
    id: "heritage",
    favours: ["heritage"],
    nights: even,
    labels: L(
      { tag: "HERITAGE", title: "Palaces, temples and old towns", gives: "The places people come to Korea for", costs: "More walking, more entrance queues" },
      { tag: "문화유산", title: "고궁·사찰·옛 도심", gives: "한국에 오는 이유가 되는 곳들", costs: "더 걷고, 입장 대기가 있습니다" },
      { tag: "文化遺産", title: "宮殿・寺院・旧市街", gives: "韓国を訪れる理由になる場所", costs: "歩く距離と入場待ちが増えます" },
      { tag: "文化遗产", title: "宫殿、寺庙与老城", gives: "来韩国的理由所在", costs: "步行更多，入场需排队" },
      { tag: "文化遺產", title: "宮殿、寺廟與老城", gives: "來韓國的理由所在", costs: "步行更多，入場需排隊" },
    ),
  },
  {
    id: "food-market",
    favours: ["food", "shopping"],
    nights: even,
    labels: L(
      { tag: "FOOD & MARKETS", title: "Markets, streets and meals", gives: "Short walks between eating", costs: "Fewer headline sights" },
      { tag: "음식·시장", title: "시장과 골목, 그리고 식사", gives: "먹는 곳 사이 거리가 짧습니다", costs: "이름난 명소는 줄어듭니다" },
      { tag: "食と市場", title: "市場と路地、そして食事", gives: "食べ歩きの移動が短いです", costs: "有名観光地は少なめです" },
      { tag: "美食与市场", title: "市场、街巷与美食", gives: "用餐之间步行距离短", costs: "热门景点会减少" },
      { tag: "美食與市場", title: "市場、街巷與美食", gives: "用餐之間步行距離短", costs: "熱門景點會減少" },
    ),
  },
  {
    id: "fewest-moves",
    favours: ["heritage", "family"],
    nights: (cities, total) => (cities <= 2 ? even(cities, total) : [Math.ceil(total / 2), ...even(cities - 1, Math.floor(total / 2))]),
    labels: L(
      { tag: "LEAST MOVING", title: "As few hotel changes as possible", gives: "Easiest with children or heavy bags", costs: "Some cities get only a few hours" },
      { tag: "최소 이동", title: "숙소를 가장 적게 옮기는 계획", gives: "아이나 짐이 많을 때 편합니다", costs: "어떤 도시는 몇 시간뿐입니다" },
      { tag: "移動最小", title: "宿の移動を最小限に", gives: "子ども連れや荷物が多い場合に楽です", costs: "数時間しか滞在できない都市もあります" },
      { tag: "最少移动", title: "尽量减少换酒店", gives: "带小孩或行李多时更轻松", costs: "有些城市只能停留数小时" },
      { tag: "最少移動", title: "盡量減少換飯店", gives: "帶小孩或行李多時更輕鬆", costs: "有些城市只能停留數小時" },
    ),
  },
];

export type PlanDay = {
  /** 1-based. */
  n: number;
  city: string;
  /** Real places, in visiting order. */
  stops: JourneyOption[];
  /** Our own estimate, marked as such wherever it is shown. */
  minutes: number;
};

export type GeneratedPlan = {
  id: PlanStrategyId;
  strategy: PlanStrategy;
  /** City name → nights, in travel order. */
  legs: { city: string; nights: number }[];
  days: PlanDay[];
  /** How many times the traveler changes hotel. Derived, not asserted. */
  stayChanges: number;
  placeCount: number;
  /** Estimated minutes of dwell + transfer across the whole trip. */
  minutes: number;
  /**
   * What the places on this plan cost, and how much of that we actually know.
   *
   * `priced` counts places carrying a real figure. When it is 0 — which it is
   * for every freshly ingested city — `known` is 0 and the UI must show a
   * blank, never a total.
   */
  known: number;
  priced: number;
};

const ROTATE = <T,>(arr: readonly T[], by: number): T[] => arr.map((_, i) => arr[(i + by) % arr.length]);

/**
 * Order places for a day: what this strategy favours first, then the rest.
 * Rotating by the day number stops every plan from opening on the same place.
 */
const VAGUE = /need|varies|check|n\/a/i;
/**
 * How much we can actually tell the traveler about this place.
 *
 * Every record carries the same 60-minute stay and 15-minute transfer, so
 * ordering ties almost everywhere and the tie broke alphabetically — which is
 * why a day came out as Achasan, Africa Museum, Ahn Junggeun, Aimeigroup.
 * Four entries starting with A is the alphabet showing through a sort that
 * had nothing else to say.
 *
 * Same fix as the live list: prefer the rows whose hours and fee are filled
 * in. It ranks our own knowledge and claims nothing about the place.
 */
const tellsYouMore = (o: JourneyOption): number =>
  (o.hoursEn && !VAGUE.test(o.hoursEn) ? 1 : 0) + (o.costEn && !VAGUE.test(o.costEn) ? 1 : 0);

const byUsefulness = (a: JourneyOption, b: JourneyOption) => tellsYouMore(b) - tellsYouMore(a);

function pickForDay(pool: JourneyOption[], favours: JourneyOption["category"][], dayIndex: number, want: number) {
  const preferred = pool.filter((o) => favours.includes(o.category)).sort(byUsefulness);
  const others = pool.filter((o) => !favours.includes(o.category)).sort(byUsefulness);
  const ordered = [...ROTATE(preferred, dayIndex * want), ...ROTATE(others, dayIndex)];
  return ordered.slice(0, want);
}

export function generatePlans(cities: readonly string[], nights: number, perDay = 4): GeneratedPlan[] {
  if (!cities.length || nights < 1) return [];

  return STRATEGIES.map((strategy) => {
    const split = strategy.nights(cities.length, nights);
    const legs = cities.map((city, i) => ({ city, nights: split[i] ?? 0 }));

    // A city with zero nights is still visited — as a day trip from the hub.
    const dayCities: string[] = [];
    legs.forEach((leg, i) => {
      const count = leg.nights > 0 ? leg.nights : i === 0 ? 0 : 1;
      for (let d = 0; d < count; d++) dayCities.push(leg.city);
    });
    if (!dayCities.length) dayCities.push(cities[0]);

    const used = new Set<string>();
    const days: PlanDay[] = dayCities.map((city, i) => {
      const pool = optionsForCities([city]).filter((o) => !used.has(o.id));
      const stops = pickForDay(pool, strategy.favours, i, perDay);
      stops.forEach((s) => used.add(s.id));
      return {
        n: i + 1,
        city,
        stops,
        minutes: stops.reduce((m, s) => m + s.stayMinutes + s.transferMinutes, 0),
      };
    });

    const all = days.flatMap((d) => d.stops);
    const priced = all.filter((o) => o.cost > 0);

    return {
      id: strategy.id,
      strategy,
      legs,
      days,
      stayChanges: Math.max(0, legs.filter((l) => l.nights > 0).length - 1),
      placeCount: all.length,
      minutes: days.reduce((m, d) => m + d.minutes, 0),
      known: priced.reduce((sum, o) => sum + o.cost, 0),
      priced: priced.length,
    };
  }).filter((p) => p.placeCount > 0);
}

/** "Seoul 3N → Gyeongju 2N". Day-trip cities are named without a night count. */
export const routeText = (plan: GeneratedPlan, nightWord: string): string =>
  plan.legs.map((l) => (l.nights > 0 ? `${cityLabel(l.city)} ${l.nights}${nightWord}` : cityLabel(l.city))).join(" → ");
