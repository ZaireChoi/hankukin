"use client";

import { useState } from "react";
import { makeT, makeTf, type Lang } from "../i18n";
import { destinationRegions } from "../data/journey";
import { cityLabel } from "../data/places";

/**
 * The line at the top of the LIVE tab: where this trip actually goes.
 *
 * It used to read "Seoul → Gyeongju · Day 2 · Family of 4" for everyone,
 * because both strings were literals in the dictionary. Someone planning Jeonju
 * and Yeosu opened the app and was told they were going to Gyeongju.
 *
 * Two things follow from that:
 *
 *   1. The heading is DERIVED. No city appears here unless the traveler put it
 *      in the trip. With nothing chosen it says so and invites a choice, rather
 *      than borrowing a city to look complete.
 *
 *   2. The heading is the CONTROL. The obvious thing to do when a place is
 *      wrong is to click it, so clicking it opens the picker — no hunting
 *      through tabs for where the setting lives.
 */
export function TripHeading({
  lang,
  origin,
  destinations,
  onToggleDestination,
  party,
}: {
  lang: Lang;
  /** The traveler's own departure city, already formatted for display. */
  origin: string;
  destinations: string[];
  onToggleDestination: (city: string) => void;
  party: number;
}) {
  const t = makeT(lang);
  const tf = makeTf(lang);
  const [open, setOpen] = useState(false);

  const label = destinations.length
    ? [origin, ...destinations.map(cityLabel)].filter(Boolean).join(" → ")
    : t("where_are_you_going");

  return (
    <div className="trip-heading-editable">
      <p>{tf("0_people", party)}</p>
      <button
        type="button"
        className={`trip-heading-button ${destinations.length ? "" : "is-empty"}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h1>{label}</h1>
        <span className="trip-heading-hint">{open ? t("done") : t("tap_to_change")}</span>
      </button>

      {open && (
        <div className="trip-heading-picker">
          <p className="filler-label">{t("add_a_stop_in_korea")}</p>
          {destinationRegions.map((region) => (
            <section key={region.id}>
              <span>{lang === "ko" ? region.ko : region.en}</span>
              <div>
                {region.cities.map((city) => {
                  const on = destinations.includes(city);
                  return (
                    <button
                      key={city}
                      type="button"
                      className={on ? "active" : ""}
                      onClick={() => onToggleDestination(city)}
                    >
                      {on ? "✓" : "+"} {cityLabel(city)}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          <button type="button" className="trip-heading-done" onClick={() => setOpen(false)}>
            {t("done")}
          </button>
        </div>
      )}
    </div>
  );
}
