"use client";

import { useState } from "react";
import { makeT, loc, type Lang } from "../i18n";
import { originLocations, originRegionGroups, type OriginCountry } from "../data/journey";

/**
 * Where the trip starts, in the three parts a person actually knows.
 *
 * COUNTRY · CITY · NEIGHBOURHOOD — and it stops there.
 *
 * It used to be one free-text box, and pressing "use my location" filled it
 * with `17.41250, 78.34580`. Nobody recognises their own home as a pair of
 * decimals, so the most personal field on the screen was also the least
 * legible one. Worse, it was legible to the wrong audience: a street address
 * is the single most sensitive thing this app could hold, and a text box
 * invites one.
 *
 * ── Why the picker refuses to go finer than a neighbourhood ─────────────
 *
 * Not squeamishness — the first leg does not need it. "Financial District,
 * Hyderabad" is enough to say how long it takes to reach the airport and what
 * that costs. A street number would change nothing in the plan and would put
 * a real home address into a trip file people forward to each other.
 * `HOME_ADDRESS_RULE` has said this in the data layer since the beginning;
 * this screen is where the rule becomes something you can see.
 *
 * ── Why "use my location" does not fill the field ───────────────────────
 *
 * The browser gives coordinates, and coordinates are not a place name.
 * Turning one into the other means sending the position to a mapping service —
 * exactly the thing the rule says we do not do by default. So the button is
 * honest about the trade: it says we have the position and cannot name it
 * without asking someone else, and hands the choice back. Two taps in the
 * list beats one tap that quietly ships a home address to a third party.
 */
export function OriginPicker({
  lang, country, city, area, onCountry, onCity, onArea, freeText, onFreeText,
}: {
  lang: Lang;
  country: OriginCountry;
  city: string;
  area: string;
  onCountry: (c: OriginCountry) => void;
  onCity: (id: string) => void;
  onArea: (a: string) => void;
  /** For the traveler whose city is not in our list. Still no street. */
  freeText: string;
  onFreeText: (v: string) => void;
}) {
  const t = makeT(lang);
  const [region, setRegion] = useState("all");
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState<"idle" | "asked" | "refused">("idle");
  const [typing, setTyping] = useState(false);

  const countryData = originLocations[country];
  const cityData = countryData.cities.find((c) => c.id === city) ?? countryData.cities[0];

  const q = query.trim().toLowerCase();
  const inRegion = (id: string) =>
    region === "all" || (originRegionGroups.find((g) => g.id === region)?.countries ?? []).includes(id);
  const countries = (Object.keys(originLocations) as OriginCountry[]).filter((id) => {
    if (!inRegion(id)) return false;
    if (!q) return true;
    const d = originLocations[id];
    return d.en.toLowerCase().includes(q) || d.ko.includes(query.trim());
  });

  const askLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setLocating("refused"); return; }
    // We deliberately do not keep the coordinates. They would only be useful
    // if we sent them somewhere, and we are not going to.
    navigator.geolocation.getCurrentPosition(() => setLocating("asked"), () => setLocating("refused"), { timeout: 7000 });
  };

  return (
    <div className="origin-picker">
      <p className="origin-lead">{t("this_sets_the_first_leg")}</p>

      <div className="origin-live">
        <b>{[area, loc(lang, cityData), loc(lang, countryData)].filter(Boolean).join(" · ")}</b>
        <button type="button" className="origin-locate" onClick={askLocation}>{t("use_my_location")}</button>
      </div>
      {locating === "asked" && <p className="origin-note">{t("we_have_your_position_not_its_name")}</p>}
      {locating === "refused" && <p className="origin-note">{t("location_unavailable")}</p>}

      <section className="origin-step">
        <span>{t("country")}</span>
        <div className="origin-regions">
          {originRegionGroups.map((g) => (
            <button key={g.id} type="button" className={region === g.id ? "active" : ""} onClick={() => setRegion(g.id)}>
              {lang === "ko" ? g.ko : g.en}
            </button>
          ))}
        </div>
        <input className="origin-search" value={query} placeholder={t("search_countries")}
          onChange={(e) => setQuery(e.target.value)} />
        <div className="origin-options">
          {countries.map((id) => (
            <button key={id} type="button" className={country === id ? "active" : ""} onClick={() => onCountry(id)}>
              {loc(lang, originLocations[id])}
            </button>
          ))}
        </div>
      </section>

      <section className="origin-step">
        <span>{t("city_label")}</span>
        <div className="origin-options">
          {countryData.cities.map((c) => (
            <button key={c.id} type="button" className={cityData.id === c.id ? "active" : ""} onClick={() => onCity(c.id)}>
              {loc(lang, c)}
            </button>
          ))}
        </div>
      </section>

      <section className="origin-step">
        <span>{t("neighbourhood")}</span>
        <div className="origin-options">
          {cityData.areas.map((a) => (
            <button key={a} type="button" className={area === a ? "active" : ""} onClick={() => onArea(a)}>
              {a}
            </button>
          ))}
        </div>
        <p className="origin-note">{t("neighbourhood_is_close_enough")}</p>
      </section>

      {/* Our list is not the world. Someone from Tashkent still has a trip. */}
      <button type="button" className="origin-freetext-toggle" onClick={() => setTyping((v) => !v)}>
        {t("not_in_the_list")}
      </button>
      {typing && (
        <input className="origin-search" value={freeText} placeholder={t("eg_your_city_and_country")}
          onChange={(e) => onFreeText(e.target.value)} />
      )}
    </div>
  );
}
