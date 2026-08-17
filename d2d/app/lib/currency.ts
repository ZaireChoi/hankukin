import type { OriginCountry } from "../data/journey";

/**
 * Money, in the currency the traveler actually thinks in.
 *
 * A budget box that only accepts won asks someone in Hyderabad to do mental
 * arithmetic before they can answer the simplest question in the app. So the
 * default follows where they said they live, and the filter offers the two
 * currencies every traveler to Korea ends up holding: their own and ₩.
 *
 * ── The part most apps get wrong ────────────────────────────────────────
 *
 * Converting needs a RATE, and we do not have one. There is no rate source
 * connected, and there is a strong temptation to hardcode "1 USD = 1,380 KRW"
 * because it makes every screen look finished. That number would be wrong
 * within a week and wrong by a different amount for every traveler — nobody
 * pays the mid-market rate. What they pay is their card's rate, plus its fee.
 *
 * This is the same failure as the ₩8,940,000 totals on the old plan cards:
 * the most confident number on the screen being the least true one.
 *
 * So the rate is THE TRAVELER'S OWN, entered once, and every figure derived
 * from it is labelled as theirs — never as official. If they do not enter one,
 * amounts stay in the currency they were given in. A blank is honest.
 */

export type CurrencyCode = "KRW" | "USD" | "INR" | "JPY" | "CNY" | "TWD" | "HKD" | "VND"
  | "THB" | "SGD" | "MYR" | "IDR" | "PHP" | "NPR" | "BDT" | "GBP" | "EUR" | "CHF"
  | "BRL" | "ARS" | "CLP" | "PEN" | "COP" | "CAD" | "MXN" | "AUD" | "NZD" | "SAR" | "AED";

export type Currency = { code: CurrencyCode; symbol: string; decimals: 0 | 2 };

/** Decimals matter: ₩1,200 and $12.00 are both right; ₩1,200.00 is not. */
export const CURRENCIES: Record<CurrencyCode, Currency> = {
  KRW: { code: "KRW", symbol: "₩", decimals: 0 },
  USD: { code: "USD", symbol: "$", decimals: 2 },
  INR: { code: "INR", symbol: "₹", decimals: 0 },
  JPY: { code: "JPY", symbol: "¥", decimals: 0 },
  CNY: { code: "CNY", symbol: "¥", decimals: 2 },
  TWD: { code: "TWD", symbol: "NT$", decimals: 0 },
  HKD: { code: "HKD", symbol: "HK$", decimals: 2 },
  VND: { code: "VND", symbol: "₫", decimals: 0 },
  THB: { code: "THB", symbol: "฿", decimals: 0 },
  SGD: { code: "SGD", symbol: "S$", decimals: 2 },
  MYR: { code: "MYR", symbol: "RM", decimals: 2 },
  IDR: { code: "IDR", symbol: "Rp", decimals: 0 },
  PHP: { code: "PHP", symbol: "₱", decimals: 0 },
  NPR: { code: "NPR", symbol: "Rs", decimals: 0 },
  BDT: { code: "BDT", symbol: "৳", decimals: 0 },
  GBP: { code: "GBP", symbol: "£", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", decimals: 2 },
  CHF: { code: "CHF", symbol: "CHF", decimals: 2 },
  BRL: { code: "BRL", symbol: "R$", decimals: 2 },
  ARS: { code: "ARS", symbol: "$", decimals: 0 },
  CLP: { code: "CLP", symbol: "$", decimals: 0 },
  PEN: { code: "PEN", symbol: "S/", decimals: 2 },
  COP: { code: "COP", symbol: "$", decimals: 0 },
  CAD: { code: "CAD", symbol: "C$", decimals: 2 },
  MXN: { code: "MXN", symbol: "MX$", decimals: 2 },
  AUD: { code: "AUD", symbol: "A$", decimals: 2 },
  NZD: { code: "NZD", symbol: "NZ$", decimals: 2 },
  SAR: { code: "SAR", symbol: "SR", decimals: 2 },
  AED: { code: "AED", symbol: "AED", decimals: 2 },
};

/** Where they live decides the default. Not the browser locale — that lies on holiday. */
export const COUNTRY_CURRENCY: Record<OriginCountry, CurrencyCode> = {
  india: "INR", korea: "KRW", usa: "USD", japan: "JPY", vietnam: "VND", china: "CNY",
  taiwan: "TWD", hongkong: "HKD", thailand: "THB", singapore: "SGD", malaysia: "MYR",
  indonesia: "IDR", philippines: "PHP", nepal: "NPR", bangladesh: "BDT", uk: "GBP",
  france: "EUR", germany: "EUR", italy: "EUR", spain: "EUR", netherlands: "EUR",
  switzerland: "CHF", brazil: "BRL", argentina: "ARS", chile: "CLP", peru: "PEN",
  colombia: "COP", canada: "CAD", mexico: "MXN", australia: "AUD", newzealand: "NZD",
  saudi: "SAR", uae: "AED",
};

export const currencyForCountry = (c: OriginCountry): CurrencyCode => COUNTRY_CURRENCY[c] ?? "USD";

export function formatMoney(amount: number, code: CurrencyCode): string {
  const c = CURRENCIES[code] ?? CURRENCIES.USD;
  const n = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: c.decimals,
    maximumFractionDigits: c.decimals,
  }).format(amount);
  return `${c.symbol}${n}`;
}

/**
 * How many won one unit of `code` buys — the traveler's own number.
 *
 * `null` means they have not told us, and that is a normal state, not an
 * error. Everything that would need it shows the original currency instead.
 */
export type Rates = Partial<Record<CurrencyCode, number>>;

/** KRW → their currency. Returns null when we have no rate, never a guess. */
export function fromWon(won: number, code: CurrencyCode, rates: Rates): number | null {
  if (code === "KRW") return won;
  const rate = rates[code];
  return rate && rate > 0 ? won / rate : null;
}

/** Their currency → KRW, for the budget they typed in their own money. */
export function toWon(amount: number, code: CurrencyCode, rates: Rates): number | null {
  if (code === "KRW") return amount;
  const rate = rates[code];
  return rate && rate > 0 ? amount * rate : null;
}

/**
 * The three choices offered, in the order a traveler wants them.
 *
 * Theirs first because it is the one they can judge. ₩ because it is what
 * every price tag in Korea says. USD because it is what most cross-border
 * booking sites quote, and comparing to it is a habit.
 */
export const filterFor = (home: CurrencyCode): CurrencyCode[] =>
  [home, "KRW" as const, "USD" as const].filter((c, i, a) => a.indexOf(c) === i);
