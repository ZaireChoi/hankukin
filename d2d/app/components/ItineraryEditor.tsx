"use client";

import { makeT, type Lang } from "../i18n";
import {
  LEG_KINDS,
  newLeg,
  cityStopLegs,
  lastKoreaIndex,
  validate,
  isRoundTrip,
  borderCrossings,
  type JourneyLeg,
  type LegKind,
} from "../data/journey-legs";

/**
 * Let the traveler shape their own journey.
 *
 * Seven legs is what most round trips look like, so it is where we start. It is
 * not what every trip looks like — open-jaw, stopovers, a ferry into Busan, a
 * domestic hop to Jeju, a one-way move. Any of those breaks a fixed structure,
 * so the structure is a list the traveler edits.
 *
 * The only thing that resists deletion is the pair of door legs, because a
 * journey that does not start and end at someone's door is not door to door.
 * Even that is a warning rather than a wall: a one-way trip is a real journey
 * and the app says what is missing instead of refusing the edit.
 */
export function ItineraryEditor({
  lang,
  legs,
  onChange,
  cities = [],
}: {
  lang: Lang;
  legs: JourneyLeg[];
  onChange: (legs: JourneyLeg[]) => void;
  /** Korean cities the traveler already picked, offered as one-tap stops. */
  cities?: readonly string[];
}) {
  const t = makeT(lang);
  const issues = validate(legs);
  const crossings = borderCrossings(legs);

  const move = (i: number, delta: number) => {
    const next = [...legs];
    const j = i + delta;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const remove = (i: number) => onChange(legs.filter((_, n) => n !== i));

  const insertAfter = (i: number, kind: LegKind) => {
    const next = [...legs];
    const side = legs[i]?.side ?? "korea";
    next.splice(i + 1, 0, newLeg(kind, side));
    onChange(next);
  };

  const meta = (kind: LegKind) => LEG_KINDS.find((k) => k.kind === kind);

  /** One tap adds the repeating unit: get there, then stay there. */
  const addCityStop = (city: string, how: LegKind) => {
    const next = [...legs];
    next.splice(lastKoreaIndex(legs) + 1, 0, ...cityStopLegs(city, how));
    onChange(next);
  };

  /** Cities already present as a stay, so we do not offer them twice. */
  const alreadyStopped = new Set(legs.filter((l) => l.kind === "stay").map((l) => l.toLabel));

  return (
    <section className="itinerary-editor">
      <header>
        <strong>{t("your_journey_shape")}</strong>
        <small>{t("seven_is_a_starting_point")}</small>
      </header>

      <ol className="leg-list">
        {legs.map((leg, i) => {
          const m = meta(leg.kind);
          return (
            <li key={leg.uid} className={`leg-item ${leg.locked ? "is-locked" : ""}`}>
              <span className="leg-n">{String(i + 1).padStart(2, "0")}</span>
              <span className="leg-body">
                <b>{m?.labels[lang]}</b>
                <em>{leg.touchesHome ? t("your_own_address") : (leg.toLabel ?? m?.hint[lang])}</em>
              </span>
              <span className="leg-actions">
                <button type="button" onClick={() => move(i, -1)} aria-label="up" disabled={i === 0}>↑</button>
                <button type="button" onClick={() => move(i, 1)} aria-label="down" disabled={i === legs.length - 1}>↓</button>
                {leg.locked ? (
                  <b className="leg-lock">{t("kept")}</b>
                ) : (
                  <button type="button" className="leg-remove" onClick={() => remove(i)} aria-label="remove">×</button>
                )}
              </span>
              <span className="leg-add">
                {LEG_KINDS.filter((k) => k.repeatable).map((k) => (
                  <button key={k.kind} type="button" onClick={() => insertAfter(i, k.kind)}>
                    + {k.labels[lang]}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ol>

      {cities.length > 0 && (
        <div className="city-stops">
          <p className="filler-label">{t("add_a_stop_in_korea")}</p>
          <div className="city-stop-buttons">
            {cities.map((c) => (
              <span key={c} className={`city-stop ${alreadyStopped.has(c) ? "is-added" : ""}`}>
                <b>{c}</b>
                <button type="button" onClick={() => addCityStop(c, "ground")}>+ {t("by_ground")}</button>
                <button type="button" onClick={() => addCityStop(c, "air-domestic")}>+ {t("by_air")}</button>
                <button type="button" onClick={() => addCityStop(c, "sea")}>+ {t("by_sea")}</button>
              </span>
            ))}
          </div>
          <small className="city-stop-note">{t("each_stop_adds_two_legs")}</small>
        </div>
      )}

      <div className="itinerary-summary">
        <span>
          {t("border_crossings")} <b>{crossings}</b>
        </span>
        <span>{isRoundTrip(legs) ? t("round_trip") : t("one_way_journey")}</span>
      </div>

      {issues.length > 0 && (
        <p className="itinerary-issue">
          {issues.includes("empty")
            ? t("itinerary_is_empty")
            : t("journey_does_not_start_or_end_at_home")}
        </p>
      )}
    </section>
  );
}
