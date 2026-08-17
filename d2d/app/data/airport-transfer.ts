import type { Lang } from "../i18n";

/**
 * Getting between a Korean airport and the first/last stay.
 *
 * These two legs sit INSIDE Korea, so unlike the home legs we know what the
 * options are — airport railroad, limousine bus, taxi. What we deliberately do
 * NOT do is hardcode the fares.
 *
 * Fares change, and a number typed into a source file in August is a lie by
 * November. The product's own rule is that a figure is either official with a
 * checked date, or it is visibly ours. An invented fare is neither. So the
 * options carry what is stable — the mode, roughly how long, what drives the
 * price — and the amount stays empty until a fare source is connected or the
 * traveler fills it in.
 */

export type TransferMode = "airport-rail" | "limousine" | "taxi" | "private" | "pickup";

export type TransferOption = {
  id: TransferMode;
  /** What makes this cost what it costs — shown so the estimate is inspectable. */
  drivers: string[];
  /** Luggage-friendliness matters more than price for a family of four. */
  luggage: "easy" | "moderate" | "hard";
  labels: Record<Lang, string>;
  notes: Record<Lang, string>;
};

const L = (en: string, ko: string, ja: string, zhHans: string, zhHant: string): Record<Lang, string> =>
  ({ en, ko, ja, "zh-Hans": zhHans, "zh-Hant": zhHant });

export const TRANSFER_OPTIONS: TransferOption[] = [
  {
    id: "airport-rail",
    drivers: ["fare per person", "party size", "transfers"],
    luggage: "moderate",
    labels: L("Airport railroad", "공항철도", "空港鉄道", "机场铁路", "機場鐵路"),
    notes: L(
      "Cheapest per person. One or two transfers with luggage.",
      "1인당 가장 저렴합니다. 짐을 들고 1~2회 환승합니다.",
      "1人あたり最安。荷物を持って1〜2回乗り換えます。",
      "人均最便宜。需带行李换乘1～2次。",
      "人均最便宜。需帶行李換乘1～2次。",
    ),
  },
  {
    id: "limousine",
    drivers: ["fare per person", "party size"],
    luggage: "easy",
    labels: L("Limousine bus", "리무진버스", "リムジンバス", "机场大巴", "機場巴士"),
    notes: L(
      "No transfers, luggage stowed under the bus. Slower in traffic.",
      "환승 없이 짐은 화물칸에. 정체 시 더 걸립니다.",
      "乗り換えなし・荷物は荷室へ。渋滞時は時間がかかります。",
      "无需换乘，行李放行李舱。堵车时较慢。",
      "無需換乘，行李放行李艙。塞車時較慢。",
    ),
  },
  {
    id: "taxi",
    drivers: ["distance", "time of day", "tolls"],
    luggage: "easy",
    labels: L("Taxi", "택시", "タクシー", "出租车", "計程車"),
    notes: L(
      "Door to door. Priced per car, so it splits well across four people.",
      "문 앞까지. 대당 요금이라 4명이면 나눠집니다.",
      "ドアツードア。車単位の料金なので4人なら割安です。",
      "门到门。按车计价，4人分摊划算。",
      "門到門。按車計價，4人分攤划算。",
    ),
  },
  {
    id: "private",
    drivers: ["vehicle size", "distance", "booking"],
    luggage: "easy",
    labels: L("Private transfer", "예약 차량", "貸切送迎", "预约专车", "預約專車"),
    notes: L(
      "Booked in advance. Worth it with small children or many bags.",
      "사전 예약. 어린아이나 짐이 많을 때 유리합니다.",
      "事前予約。小さな子ども連れや荷物が多い場合に有利です。",
      "需提前预订。带小孩或行李多时更方便。",
      "需提前預訂。帶小孩或行李多時更方便。",
    ),
  },
  {
    id: "pickup",
    drivers: [],
    luggage: "easy",
    labels: L("Someone picks me up", "마중 나옴", "出迎えあり", "有人来接", "有人來接"),
    notes: L(
      "No cost for this leg.",
      "이 구간 비용은 없습니다.",
      "この区間の費用はかかりません。",
      "此段无费用。",
      "此段無費用。",
    ),
  },
];

/**
 * Why there are no numbers in this file.
 *
 * We could write "공항철도 직통 ₩11,000" and it would look authoritative. It
 * would also be unverified, undated, and wrong the moment the fare changes.
 * Connect a fare source and stamp it, or let the traveler enter what they were
 * actually quoted — but do not split the difference by guessing.
 */
export const FARE_SOURCE_STATUS = {
  connected: false,
  note: "No fare API connected. Amounts come from the traveler until one is.",
} as const;
