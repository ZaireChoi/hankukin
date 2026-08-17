import type { Lang } from "../i18n";

/**
 * A journey is a LIST of legs, not a fixed shape.
 *
 * The first version of this file hardcoded seven legs and called it the trip.
 * That is wrong often enough to matter:
 *
 *   · open-jaw      in through Incheon, out through Busan
 *   · stopover      a night in Tokyo on the way
 *   · re-entry      Korea → Japan → Korea on one trip
 *   · sea arrival   ferry into Busan or Incheon port
 *   · domestic hop  Gimpo → Jeju in the middle
 *   · one way       moving to Korea, or leaving it
 *   · not from home departing mid-business-trip from another city
 *
 * So seven legs is a TEMPLATE the traveler starts from and then edits. The
 * structure is the list; the template is a convenience.
 */

export type LegKind =
  | "door"           // someone's own front door ↔ a station or airport
  | "ground"         // ground transfer: rail, bus, taxi, car
  | "air-intl"       // crossing a border by air
  | "air-domestic"   // inside one country
  | "sea"            // ferry, cruise
  | "rail-intl"      // overland border crossing by rail
  | "stay";          // a block of time in one place, not a movement

export type LegSide = "outbound" | "korea" | "return";

/** One leg in a traveler's actual itinerary. */
export type JourneyLeg = {
  /** Stable within a session so the list can be reordered and edited. */
  uid: string;
  kind: LegKind;
  side: LegSide;
  /** Free text — the traveler's own words for where this goes. */
  fromLabel?: string;
  toLabel?: string;
  /** True only for the legs that touch the traveler's own address. */
  touchesHome: boolean;
  /** Locked legs cannot be deleted — see REQUIRED_INVARIANTS. */
  locked?: boolean;
};

export type LegKindMeta = {
  kind: LegKind;
  /** Can the traveler add more of these? A trip has many grounds, one home. */
  repeatable: boolean;
  labels: Record<Lang, string>;
  hint: Record<Lang, string>;
};

const L = (en: string, ko: string, ja: string, zhHans: string, zhHant: string): Record<Lang, string> =>
  ({ en, ko, ja, "zh-Hans": zhHans, "zh-Hant": zhHant });

export const LEG_KINDS: LegKindMeta[] = [
  { kind: "door", repeatable: false,
    labels: L("Home", "집", "自宅", "家", "家"),
    hint: L("Where you set off from", "출발하는 집", "出発する自宅", "出发的家", "出發的家") },
  { kind: "ground", repeatable: true,
    labels: L("Ground transfer", "지상 이동", "陸路移動", "地面交通", "地面交通"),
    hint: L("Rail, bus, taxi or car", "철도·버스·택시·자가용", "鉄道・バス・タクシー・車", "铁路、巴士、出租车或自驾", "鐵路、巴士、計程車或自駕") },
  { kind: "air-intl", repeatable: true,
    labels: L("International flight", "국제선", "国際線", "国际航班", "國際航班"),
    hint: L("Crosses a border", "국경을 넘습니다", "国境を越えます", "跨越国境", "跨越國境") },
  { kind: "air-domestic", repeatable: true,
    labels: L("Domestic flight", "국내선", "国内線", "国内航班", "國內航班"),
    hint: L("Gimpo → Jeju, for example", "예: 김포 → 제주", "例：金浦 → 済州", "例如：金浦 → 济州", "例如：金浦 → 濟州") },
  { kind: "sea", repeatable: true,
    labels: L("Ferry", "여객선", "フェリー", "轮渡", "渡輪"),
    hint: L("Sea arrival or departure", "해상 입출국", "海路での出入国", "海路出入境", "海路出入境") },
  { kind: "rail-intl", repeatable: true,
    labels: L("Overland crossing", "육로 국경", "陸路国境", "陆路口岸", "陸路口岸"),
    hint: L("Border by rail or road", "철도·도로 국경 통과", "鉄道・道路での国境通過", "经铁路或公路过境", "經鐵路或公路過境") },
  { kind: "stay", repeatable: true,
    labels: L("Stay", "체류", "滞在", "停留", "停留"),
    hint: L("Time in one place, not a movement", "이동이 아니라 머무는 시간", "移動ではなく滞在する時間", "停留时间，非移动", "停留時間，非移動") },
];

let seq = 0;
const uid = () => `leg-${++seq}`;

/**
 * The default seven. A starting point, not a contract — every leg except the
 * two door legs can be removed, and any kind can be inserted anywhere.
 */
export function defaultItinerary(): JourneyLeg[] {
  return [
    { uid: uid(), kind: "door", side: "outbound", touchesHome: true, locked: true, fromLabel: "home" },
    { uid: uid(), kind: "air-intl", side: "outbound", touchesHome: false },
    { uid: uid(), kind: "ground", side: "korea", touchesHome: false },
    { uid: uid(), kind: "stay", side: "korea", touchesHome: false },
    { uid: uid(), kind: "ground", side: "return", touchesHome: false },
    { uid: uid(), kind: "air-intl", side: "return", touchesHome: false },
    { uid: uid(), kind: "door", side: "return", touchesHome: true, locked: true, toLabel: "home" },
  ];
}

export const newLeg = (kind: LegKind, side: LegSide, label?: string): JourneyLeg => ({
  uid: uid(), kind, side, touchesHome: false, toLabel: label,
});

/**
 * Inside Korea the shape varies just as much as the international part.
 *
 *   서울 3박 → KTX → 경주 2박 → 버스 → 부산 2박 → 국내선 → 제주 3박
 *
 * That is six legs where the default template has two. The repeating unit is
 * "get there, then stay there", so adding a city inserts BOTH — asking someone
 * to add a transfer and a stay separately, once per city, is busywork.
 */
export function cityStopLegs(cityLabel: string, how: LegKind = "ground"): JourneyLeg[] {
  return [
    { uid: uid(), kind: how, side: "korea", touchesHome: false, toLabel: cityLabel },
    { uid: uid(), kind: "stay", side: "korea", touchesHome: false, toLabel: cityLabel },
  ];
}

/** Where inside the list a Korea stop belongs: after the last Korea leg. */
export function lastKoreaIndex(legs: JourneyLeg[]): number {
  for (let i = legs.length - 1; i >= 0; i--) if (legs[i].side === "korea") return i;
  return Math.max(0, legs.length - 2);
}

/**
 * What a journey must keep, however the traveler edits it.
 *
 * Only one rule is absolute, and it is the product's name: a round trip starts
 * and ends at the traveler's door. Everything between is theirs to arrange.
 *
 * One-way is a legitimate journey — moving to Korea, or leaving it — so the
 * check reports what is missing rather than forbidding the edit.
 */
export type ItineraryIssue = "no-start-door" | "no-end-door" | "empty";

export function validate(legs: JourneyLeg[]): ItineraryIssue[] {
  const issues: ItineraryIssue[] = [];
  if (legs.length === 0) return ["empty"];
  if (legs[0]?.kind !== "door") issues.push("no-start-door");
  if (legs[legs.length - 1]?.kind !== "door") issues.push("no-end-door");
  return issues;
}

/** A one-way trip is valid; it simply is not a loop. */
export const isRoundTrip = (legs: JourneyLeg[]) =>
  legs.length > 1 && legs[0]?.kind === "door" && legs[legs.length - 1]?.kind === "door";

/** How many border crossings — drives visa and entry-requirement prompts. */
export const borderCrossings = (legs: JourneyLeg[]) =>
  legs.filter((l) => l.kind === "air-intl" || l.kind === "sea" || l.kind === "rail-intl").length;

/**
 * Parking scales with the length of the whole trip, not with the drive.
 * An eight-night trip parks nine days.
 */
export const parkingDays = (departISO: string, returnISO: string): number => {
  const ms = Date.parse(returnISO) - Date.parse(departISO);
  return Number.isFinite(ms) ? Math.max(1, Math.ceil(ms / 86_400_000) + 1) : 1;
};

export type HomeAirportMode = "transit" | "taxi" | "own-car" | "dropoff" | "shuttle";

export const HOME_AIRPORT_MODES: {
  id: HomeAirportMode;
  drivers: string[];
  labels: Record<Lang, string>;
}[] = [
  { id: "transit", drivers: ["fare", "party size", "luggage"],
    labels: L("Public transport", "대중교통", "公共交通", "公共交通", "大眾運輸") },
  { id: "taxi", drivers: ["distance", "time of day", "vehicle size"],
    labels: L("Taxi / ride-hailing", "택시·호출차량", "タクシー・配車", "出租车／网约车", "計程車／叫車") },
  { id: "own-car", drivers: ["fuel", "tolls", "parking × nights"],
    labels: L("Own car + airport parking", "자가용 + 공항주차", "自家用車＋空港駐車", "自驾＋机场停车", "自駕＋機場停車") },
  { id: "dropoff", drivers: [],
    labels: L("Someone drops me off", "가족·지인 배웅", "家族・知人の送迎", "亲友接送", "親友接送") },
  { id: "shuttle", drivers: ["fare", "party size"],
    labels: L("Airport bus / shuttle", "공항버스·셔틀", "空港バス・シャトル", "机场巴士／班车", "機場巴士／接駁車") },
];

/**
 * PRIVACY — why `touchesHome` exists.
 *
 * The door legs are the only place the traveler's own address appears. That
 * address is not handed to a third-party routing or map service: coordinates at
 * most, only on request, and nothing about it is stored server-side.
 */
export const HOME_ADDRESS_RULE = {
  sendToThirdParty: "coordinates-only",
  storeServerSide: false,
  note: "Precise home addresses stay on the device. Ask before any external lookup.",
} as const;
