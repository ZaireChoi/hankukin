"use client";

import { makeT, makeTf, type Lang } from "../i18n";
import { destinationRegions } from "../data/journey";
import { cityLabelFor } from "../lib/naming";
import { CURRENCIES, filterFor, formatMoney, toWon, type CurrencyCode, type Rates } from "../lib/currency";
import { OriginPicker } from "./OriginPicker";
import type { OriginCountry } from "../data/journey";

/**
 * Five questions, in the order a traveler actually answers them.
 *
 * What this replaces was a list of seven editable legs — "Ground transfer",
 * "International flight", "Overland crossing" — each with six buttons to insert
 * another one. That is the vocabulary of an itinerary system, not of a person
 * planning a holiday. Nobody opens a trip planner thinking "I need an overland
 * crossing"; they think "we land on the 3rd and leave on the 11th, and we want
 * to see Jeonju".
 *
 * So the legs are now DERIVED from these five answers, and the leg editor
 * survives only as an advanced view for the trips that genuinely need it —
 * open-jaw, a ferry, a re-entry.
 *
 * The one rule that shapes the screen: HOW MANY PLACES IS A CONSEQUENCE OF THE
 * DATES. Eight nights is two or three cities; four nights is one. The picker
 * says so before the traveler over-fills the trip, because the most common way
 * a first trip to Korea goes wrong is trying to see everything.
 */

export type AgeBand = "child" | "teen" | "adult" | "senior";
export type Theme = "heritage" | "food" | "family" | "shopping" | "nature";

/**
 * Why ask a theme at all when the five facts already produce a route.
 *
 * Because the same eight nights in the same three cities are a different trip
 * depending on what the traveler came for, and that is the part a route cannot
 * infer. The theme is what turns a list of places into an itinerary with a
 * shape — which places lead, which are optional, what the days are about.
 */
export const THEMES: { id: Theme; labels: Record<Lang, string> }[] = [
  { id: "heritage", labels: { en: "Palaces & history", ko: "고궁·역사", ja: "宮殿・歴史", "zh-Hans": "宫殿与历史", "zh-Hant": "宮殿與歷史" } },
  { id: "food",     labels: { en: "Food & markets",    ko: "음식·시장", ja: "食と市場",   "zh-Hans": "美食与市场", "zh-Hant": "美食與市場" } },
  { id: "family",   labels: { en: "With children",     ko: "아이와 함께", ja: "子ども連れ", "zh-Hans": "亲子出行",   "zh-Hant": "親子出行" } },
  { id: "shopping", labels: { en: "Shopping & beauty", ko: "쇼핑·뷰티", ja: "買い物・美容", "zh-Hans": "购物与美妆", "zh-Hant": "購物與美妝" } },
  { id: "nature",   labels: { en: "Coast & nature",    ko: "바다·자연", ja: "海・自然",   "zh-Hans": "海岸与自然", "zh-Hant": "海岸與自然" } },
];

export const AGE_BANDS: { id: AgeBand; labels: Record<Lang, string> }[] = [
  { id: "child",  labels: { en: "0–12",  ko: "0~12세",  ja: "0〜12歳",  "zh-Hans": "0–12岁",  "zh-Hant": "0–12歲" } },
  { id: "teen",   labels: { en: "13–18", ko: "13~18세", ja: "13〜18歳", "zh-Hans": "13–18岁", "zh-Hant": "13–18歲" } },
  { id: "adult",  labels: { en: "19–64", ko: "19~64세", ja: "19〜64歳", "zh-Hans": "19–64岁", "zh-Hant": "19–64歲" } },
  { id: "senior", labels: { en: "65+",   ko: "65세 이상", ja: "65歳以上", "zh-Hans": "65岁以上", "zh-Hant": "65歲以上" } },
];

/** Nights between two dates. Returns 0 when either is missing or reversed. */
export const nightsBetween = (from: string, to: string): number => {
  const ms = Date.parse(to) - Date.parse(from);
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 86_400_000) : 0;
};

/**
 * How many cities fit in the time available.
 *
 * Roughly three nights per city: one to arrive and settle, one to actually see
 * it, one to move on. Fewer than that and the trip is mostly stations.
 */
export const citiesThatFit = (nights: number): number => (nights <= 0 ? 0 : Math.max(1, Math.floor(nights / 3)));

export function TripSetup({
  lang,
  origin, onOrigin,
  originCountry, originCity, originArea,
  onOriginCountry, onOriginCity, onOriginArea,
  destinations, onToggleDestination,
  departDate, onDepartDate,
  returnDate, onReturnDate,
  party, onParty,
  ages, onAge,
  budget, onBudget,
  currency, onCurrency, homeCurrency, rates, onRate,
  themes, onToggleTheme,
  onDone,
}: {
  lang: Lang;
  origin: string; onOrigin: (v: string) => void;
  originCountry: OriginCountry; originCity: string; originArea: string;
  onOriginCountry: (c: OriginCountry) => void;
  onOriginCity: (id: string) => void;
  onOriginArea: (a: string) => void;
  destinations: string[]; onToggleDestination: (city: string) => void;
  departDate: string; onDepartDate: (v: string) => void;
  returnDate: string; onReturnDate: (v: string) => void;
  party: number; onParty: (n: number) => void;
  ages: Record<AgeBand, number>; onAge: (band: AgeBand, n: number) => void;
  budget: number | null; onBudget: (n: number | null) => void;
  currency: CurrencyCode; onCurrency: (c: CurrencyCode) => void;
  homeCurrency: CurrencyCode;
  rates: Rates; onRate: (c: CurrencyCode, krwPerUnit: number | null) => void;
  themes: Theme[]; onToggleTheme: (t: Theme) => void;
  onDone: () => void;
}) {
  const t = makeT(lang);
  const tf = makeTf(lang);

  const nights = nightsBetween(departDate, returnDate);
  const fits = citiesThatFit(nights);
  const tooMany = fits > 0 && destinations.length > fits;

  const step = (n: number, title: string, hint: string, body: React.ReactNode, done: boolean) => (
    <section className={`setup-step ${done ? "is-done" : ""}`}>
      <header>
        <b>{n}</b>
        <div>
          <strong>{title}</strong>
          <small>{hint}</small>
        </div>
      </header>
      <div className="setup-body">{body}</div>
    </section>
  );

  return (
    <article className="panel trip-setup">
      <div className="panel-head">
        <div>
          <span>PLAN YOUR TRIP</span>
          <h2>{t("six_questions")}</h2>
        </div>
      </div>

      {/* Country · city · neighbourhood — never a street. See OriginPicker. */}
      {step(1, t("where_do_you_start"), t("your_own_city_not_an_airport"), (
        <OriginPicker lang={lang}
          country={originCountry} city={originCity} area={originArea}
          onCountry={onOriginCountry} onCity={onOriginCity} onArea={onOriginArea}
          freeText={origin} onFreeText={onOrigin} />
      ), Boolean(originArea))}

      {step(3, t("when_do_you_travel"), t("arrival_in_korea_and_the_flight_home"), (
        <div className="setup-dates">
          <label><span>{t("depart")}</span>
            <input type="date" value={departDate} onChange={(e) => onDepartDate(e.target.value)} /></label>
          <label><span>{t("return")}</span>
            <input type="date" value={returnDate} onChange={(e) => onReturnDate(e.target.value)} /></label>
          {nights > 0 && <p className="setup-note">{tf("0_nights_fits_1_places", nights, fits)}</p>}
        </div>
      ), nights > 0)}

      {step(2, t("where_do_you_want_to_go"), nights > 0 ? tf("pick_up_to_0", fits) : t("set_your_dates_first"), (
        <div className="setup-cities">
          {destinationRegions.map((r) => (
            <section key={r.id}>
              <span>{lang === "ko" ? r.ko : r.en}</span>
              <div>
                {r.cities.map((city) => {
                  const on = destinations.includes(city);
                  return (
                    <button key={city} type="button" className={on ? "active" : ""}
                      onClick={() => onToggleDestination(city)}>
                      {on ? "✓" : "+"} {cityLabelFor(lang, city)}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {/* Said before the trip is over-filled, not after it fails. */}
          {tooMany && <p className="setup-warn">{tf("0_places_in_1_nights_is_a_lot", destinations.length, nights)}</p>}
        </div>
      ), destinations.length > 0)}

      {step(4, t("who_is_coming"), t("ages_change_fares_and_walking_pace"), (
        <div className="setup-party">
          <label className="setup-count">
            <span>{t("people")}</span>
            <button type="button" onClick={() => onParty(Math.max(1, party - 1))}>−</button>
            <b>{party}</b>
            <button type="button" onClick={() => onParty(party + 1)}>+</button>
          </label>
          <div className="setup-ages">
            {AGE_BANDS.map((b) => (
              <label key={b.id}>
                <span>{b.labels[lang]}</span>
                <input type="number" min={0} inputMode="numeric" value={ages[b.id] ?? 0}
                  onChange={(e) => onAge(b.id, Math.max(0, Number(e.target.value) || 0))} />
              </label>
            ))}
          </div>
        </div>
      ), party > 0)}

      {step(5, t("what_kind_of_trip"), t("this_decides_which_places_lead_the_days"), (
        <div className="setup-themes">
          {THEMES.map((th) => (
            <button key={th.id} type="button" className={themes.includes(th.id) ? "active" : ""}
              onClick={() => onToggleTheme(th.id)}>
              {themes.includes(th.id) ? "✓" : "+"} {th.labels[lang]}
            </button>
          ))}
        </div>
      ), themes.length > 0)}

      {step(6, t("what_is_your_budget"), t("total_for_everyone_leave_blank_if_unsure"), (
        <div className="setup-budget">
          {/* Their money first, then ₩ because that is what price tags say,
              then $ because booking sites quote it. See lib/currency.ts. */}
          <div className="currency-filter">
            <span>{t("currency")}</span>
            {filterFor(homeCurrency).map((c) => (
              <button key={c} type="button" className={currency === c ? "active" : ""} onClick={() => onCurrency(c)}>
                {CURRENCIES[c].symbol} {c}
              </button>
            ))}
          </div>

          <input type="number" min={0} inputMode="numeric"
            value={budget ?? ""} placeholder={tf("amount_in_0", currency)}
            onChange={(e) => { const v = e.target.value.trim(); onBudget(v === "" ? null : Number(v)); }} />

          {/* No rate source is connected, and we will not invent one. */}
          {currency !== "KRW" && (
            <div className="rate-ask">
              <label>
                <span>{tf("what_rate_did_you_get", currency)}</span>
                <input type="number" min={0} step="0.01" inputMode="decimal"
                  value={rates[currency] ?? ""} placeholder="₩"
                  onChange={(e) => { const v = e.target.value.trim(); onRate(currency, v === "" ? null : Number(v)); }} />
              </label>
              <small>{t("your_bank_rate_is_the_real_one")}</small>
            </div>
          )}

          {budget !== null && budget > 0 && nights > 0 && party > 0 && (() => {
            const each = budget / party / Math.max(1, nights);
            const won = toWon(budget, currency, rates);
            return (
              <>
                <p className="setup-note">{tf("0_per_person_per_night", formatMoney(each, currency))}</p>
                {currency !== "KRW" && (
                  <p className="setup-note">
                    {won === null
                      ? tf("enter_a_rate_to_see_this_in_0", "KRW")
                      : `${formatMoney(won, "KRW")} · ${t("at_your_own_rate")}`}
                  </p>
                )}
              </>
            );
          })()}
        </div>
      ), budget !== null)}

      <button className="setup-go" type="button" onClick={onDone}
        disabled={!destinations.length || nights <= 0}>
        {t("show_my_route")} →
      </button>
    </article>
  );
}
