"use client";

import { useMemo, useState } from "react";
import { makeT, makeTf, type Lang } from "../i18n";
import { cityLabel } from "../data/places";
import { AffiliateSlot } from "./AffiliateSlot";
import { whatFitsNow, minutesNow, MOODS, type Mood, type Suggestion } from "../lib/right-now";
import { clockText } from "../lib/day-chain";
import type { Theme } from "./TripSetup";
import type { JourneyOption } from "../lib/types";

/**
 * The panel for the evening the plan did not survive.
 *
 * Someone is standing in a hotel lobby at 19:40 with three hours they had not
 * allocated. What they want is not their itinerary — they can already see
 * that — and not a search box either, because they do not know the name of
 * anything within a mile of them. They want a short list of things that are
 * open, close enough, and back before bed.
 *
 * Two decisions carry this screen:
 *
 *   IT ASKS FOR THE WALL, NOT THE DURATION. "Back by 23:00" is a thing a
 *   person knows about their own evening; "I have 200 minutes" is arithmetic
 *   we should be doing for them. The free time is derived and shown, so the
 *   trade-off is visible without being a question.
 *
 *   ADDING DOES NOT FORK THE TRIP. The button says "add to today", and that
 *   is literally what happens — the place is inserted into the same chain the
 *   planner built, at the time it will actually happen. There is no "actual
 *   vs planned" split anywhere in this app, because a traveler who improvises
 *   has not gone off-plan; they have amended it.
 *
 * The unverified-hours line is not a disclaimer bolted on at the end. Most of
 * this catalogue has no published hours, and a list that hid that fact would
 * be more confident and less useful.
 */
export function RightNow({
  lang, city, themes, planned, added, onAdd, now,
}: {
  lang: Lang;
  /** The city the traveler is in tonight — from the chain, not from a setting. */
  city: string;
  themes: Theme[];
  /** Ids already on today's plan. Never offered back to them. */
  planned: Set<string>;
  added: JourneyOption[];
  onAdd: (o: JourneyOption) => void;
  /** Injectable so the tests do not depend on what time it is. */
  now?: number;
}) {
  const t = makeT(lang);
  const tf = makeTf(lang);

  const clock = now ?? minutesNow(new Date());
  const [until, setUntil] = useState<number>(Math.min(23 * 60 + 30, clock + 180));
  const [mood, setMood] = useState<Mood | null>(null);

  const free = Math.max(0, until - clock);
  const addedIds = useMemo(() => new Set(added.map((a) => a.id)), [added]);
  const exclude = useMemo(() => new Set([...planned, ...addedIds]), [planned, addedIds]);

  const results: Suggestion[] = useMemo(
    () => (city ? whatFitsNow({ city, now: clock, until, mood, themes, exclude, weekday: new Date().getDay() }) : []),
    [city, clock, until, mood, themes, exclude],
  );

  if (!city) return null;

  const toMin = (v: string): number => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v);
    return m ? Number(m[1]) * 60 + Number(m[2]) : until;
  };

  return (
    <article className="panel right-now">
      <div className="panel-head">
        <div>
          <span>{t("right_now")} · {clockText(clock)} · {cityLabel(city)}</span>
          <h2>{t("too_early_to_turn_in")}</h2>
          <p>{t("the_plan_is_not_a_contract")}</p>
        </div>
      </div>

      <div className="now-window">
        <label>
          <span>{t("back_by")}</span>
          <input type="time" value={clockText(until)} onChange={(e) => setUntil(toMin(e.target.value))} />
        </label>
        <b>{tf("0_minutes_free", free)}</b>
      </div>

      <div className="now-moods">
        {MOODS.map((m) => (
          <button key={m.id} type="button" className={mood === m.id ? "active" : ""}
            onClick={() => setMood(mood === m.id ? null : m.id)}>
            {t(`mood_${m.id}` as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {results.length === 0 && <p className="now-empty">{t("nothing_fits_that_window")}</p>}

      <ul className="now-list">
        {results.map(({ option: o, minutes, openNow }) => (
          <li key={o.id} className={`now-item ${openNow === true ? "is-open" : ""}`}>
            <div className="now-item-name">
              <strong>{o.ko}</strong>
              <small>{o.en}{o.rm ? ` · ${o.rm}` : ""}</small>
              <em>{o.zoneKo === o.zoneEn ? o.zoneEn : `${o.zoneKo} ${o.zoneEn}`}</em>
            </div>
            <div className="now-item-meta">
              <b>{minutes}′</b>
              {openNow === true
                ? <span className="now-open">{t("open_now")}</span>
                : <span className="now-unknown">{t("hours_unverified_check_before_you_go")}</span>}
              <small>{o.costEn || "—"}</small>
            </div>
            <button type="button" className="now-add" onClick={() => onAdd(o)}>{t("add_to_today")}</button>
          </li>
        ))}
      </ul>

      {added.length > 0 && (
        <p className="now-added">
          {t("added_places_show_in_the_chain")}
          <br />
          {added.map((a) => `${a.ko} ${a.en}`).join(" · ")}
        </p>
      )}

      <p className="now-note">{t("most_of_our_hours_are_unverified")}</p>

      {/* Somewhere to eat tonight is the one line where a booking link is the
          actual answer rather than an upsell attached to one. */}
      {mood === "eat" && <AffiliateSlot lang={lang} lineId="food" surface="live" />}
    </article>
  );
}
