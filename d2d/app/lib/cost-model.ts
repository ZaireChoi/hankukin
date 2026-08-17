import type { Provenance } from "./provenance";
import type { Lang } from "../i18n";
import { parkingDays, type HomeAirportMode } from "../data/journey-legs";

/**
 * The budget for the whole journey — door to door.
 *
 * The sample plans cost a trip as: air + stay + intercity + local + food +
 * experience + other. Seven lines, and not one of them is getting to your own
 * airport. A family of four taking a taxi there and parking for eight days can
 * spend more than every intercity train inside Korea combined, and the old
 * table had nowhere to put it.
 *
 * Two rules this module exists to keep:
 *
 *   1. Every line says where its number came from. A fare read off an official
 *      page and a guess about lunch must not render as the same kind of fact.
 *   2. Nothing is invented to fill a gap. A line we cannot estimate is returned
 *      as `unknown`, not as zero — zero reads as "free", which is a lie.
 */

export type CostLineId =
  | "home-to-airport"
  | "airport-parking"
  | "international-air"
  | "arrival-transfer"
  | "stays"
  | "intercity"
  | "local-transport"
  | "food"
  | "experiences"
  | "departure-transfer"
  | "airport-to-home"
  | "buffer";

export type CostLine = {
  id: CostLineId;
  /** null means "we do not know", which is not the same as 0. */
  amount: number | null;
  provenance: Provenance;
  /** Which of the seven journey legs this belongs to. */
  side: "departure" | "korea" | "return";
  labels: Record<Lang, string>;
};

const L = (en: string, ko: string, ja: string, zhHans: string, zhHant: string): Record<Lang, string> =>
  ({ en, ko, ja, "zh-Hans": zhHans, "zh-Hant": zhHant });

export const COST_LINES: Omit<CostLine, "amount" | "provenance">[] = [
  { id: "home-to-airport", side: "departure",
    labels: L("Home → airport", "우리 집 → 공항", "自宅 → 空港", "家 → 机场", "家 → 機場") },
  { id: "airport-parking", side: "departure",
    labels: L("Airport parking", "공항 주차", "空港駐車", "机场停车", "機場停車") },
  { id: "international-air", side: "departure",
    labels: L("International air", "국제선", "国際線", "国际航班", "國際航班") },
  { id: "arrival-transfer", side: "korea",
    labels: L("Airport → first stay", "공항 → 첫 숙소", "空港 → 最初の宿", "机场 → 首个住宿", "機場 → 首個住宿") },
  { id: "stays", side: "korea",
    labels: L("Stays", "숙박", "宿泊", "住宿", "住宿") },
  { id: "intercity", side: "korea",
    labels: L("Intercity", "지역 간 이동", "都市間移動", "城际交通", "城際交通") },
  { id: "local-transport", side: "korea",
    labels: L("Local transport", "현지 교통", "現地交通", "当地交通", "當地交通") },
  { id: "food", side: "korea",
    labels: L("Food", "식비", "食費", "餐饮", "餐飲") },
  { id: "experiences", side: "korea",
    labels: L("Experiences & admission", "체험·입장", "体験・入場", "体验与门票", "體驗與門票") },
  { id: "departure-transfer", side: "return",
    labels: L("Last stay → airport", "마지막 숙소 → 공항", "最後の宿 → 空港", "最后住宿 → 机场", "最後住宿 → 機場") },
  { id: "airport-to-home", side: "return",
    labels: L("Airport → home", "공항 → 우리 집", "空港 → 自宅", "机场 → 家", "機場 → 家") },
  { id: "buffer", side: "korea",
    labels: L("Buffer", "예비비", "予備費", "预备金", "預備金") },
];

export type CostInput = {
  party: number;
  departISO: string;
  returnISO: string;
  homeAirportMode: HomeAirportMode | null;
  /** Per-day parking rate at the traveler's own airport, if they said. */
  parkingPerDay?: number | null;
  /** Sums coming from the plan/selection, already in KRW. */
  korea: Partial<Record<CostLineId, number>>;
};

/**
 * The two door legs. We do not know the traveler's distance to their airport,
 * their local fares, or their currency — and guessing produces a number that
 * looks authoritative and is wrong. So these return `null` unless the traveler
 * supplied enough to compute them.
 */
function doorLeg(input: CostInput, which: "out" | "back"): { amount: number | null; provenance: Provenance } {
  const mode = input.homeAirportMode;
  if (!mode) return { amount: null, provenance: "needs-check" };
  if (mode === "dropoff") return { amount: 0, provenance: "official" };  // stated by the traveler
  const supplied = input.korea[which === "out" ? "home-to-airport" : "airport-to-home"];
  if (typeof supplied === "number") return { amount: supplied, provenance: "estimate" };
  return { amount: null, provenance: "needs-check" };
}

function parking(input: CostInput): { amount: number | null; provenance: Provenance } {
  if (input.homeAirportMode !== "own-car") return { amount: 0, provenance: "official" };
  const rate = input.parkingPerDay;
  if (!rate) return { amount: null, provenance: "needs-check" };
  // Scales with the whole trip, not the drive — an 8-night trip parks 9 days.
  return { amount: rate * parkingDays(input.departISO, input.returnISO), provenance: "estimate" };
}

export function buildCostLines(input: CostInput): CostLine[] {
  return COST_LINES.map((line) => {
    if (line.id === "home-to-airport") return { ...line, ...doorLeg(input, "out") };
    if (line.id === "airport-to-home") return { ...line, ...doorLeg(input, "back") };
    if (line.id === "airport-parking") return { ...line, ...parking(input) };
    const amount = input.korea[line.id];
    return {
      ...line,
      amount: typeof amount === "number" ? amount : null,
      provenance: typeof amount === "number" ? "estimate" : "needs-check",
    };
  });
}

/** Only what we actually know. Unknown lines are reported, never silently zeroed. */
export function totals(lines: CostLine[]) {
  const known = lines.filter((l) => typeof l.amount === "number");
  const unknown = lines.filter((l) => l.amount === null);
  const total = known.reduce((sum, l) => sum + (l.amount ?? 0), 0);
  return {
    total,
    /** True when the headline number is missing pieces and must say so. */
    incomplete: unknown.length > 0,
    unknownLines: unknown.map((l) => l.id),
    perPerson: (party: number) => (party > 0 ? Math.round(total / party) : total),
  };
}
