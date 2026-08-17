"use client";

import { useState } from "react";
import { makeT, makeTf, type Lang } from "../i18n";
import { cityLabel } from "../data/places";
import { AffiliateSlot } from "./AffiliateSlot";
import { buildChain, clockText, openDecisions, type ChainDay, type ChainNode, type MoveMode } from "../lib/day-chain";
import type { GeneratedPlan } from "../lib/plan-generator";
import type { Theme } from "./TripSetup";
import type { JourneyOption } from "../lib/types";

/**
 * The whole trip as one vertical line: node, move, node, move, home.
 *
 * The shape is the argument. A grid of days says the days are independent
 * boxes; a line says a trip is one continuous thing that happens to get dark
 * a few times. That is why day 2 opens on the very same hotel node day 1
 * closed on, greyed and labelled "where yesterday ended" — you can see the
 * seam and see that it holds.
 *
 * Three rules this component follows without exception:
 *
 *   THE MOVE IS THE CONTROL. Not the node. Tapping a hotel does not ask how
 *   you got there; the connector above it does, because that is where the
 *   question actually belongs. Every connector asks the same triple — when,
 *   how, and therefore where — so after the first one the traveler already
 *   knows how the rest of the screen works.
 *
 *   AN UNKNOWN TIME LOOKS UNKNOWN. "—" not "14:30". The flight-time box at
 *   the top is not a form field we would like filled; it is the input the
 *   day is computed from, and the screen says so where the empty day would
 *   otherwise be.
 *
 *   KOREAN AND ENGLISH TOGETHER, ALWAYS. 서울역 Seoul Station. A traveler
 *   reads the English and shows the Korean to a driver. Either one alone is
 *   half a name.
 */

const MODE_KEY = {
  walk: "mode_walk", transit: "mode_transit", taxi: "mode_taxi",
  rail: "mode_rail", bus: "mode_bus", air: "mode_air", car: "mode_car",
} as const;

const KIND_MARK: Record<ChainNode["kind"], string> = {
  home: "◆", "home-airport": "✈", "korea-airport": "✈",
  stay: "▣", place: "●", meal: "◍", station: "▤", "home-again": "◆",
};

/** Flight times, asked once, at the top — because everything below is derived from them. */
function FlightTimes({
  lang, arrival, departure, onArrival, onDeparture,
}: {
  lang: Lang;
  arrival: number | null;
  departure: number | null;
  onArrival: (m: number | null) => void;
  onDeparture: (m: number | null) => void;
}) {
  const t = makeT(lang);
  const toMin = (v: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const val = (m: number | null) => (m === null ? "" : clockText(m));

  return (
    <div className="chain-flights">
      <strong>{t("flight_times_are_yours_to_enter")}</strong>
      <div>
        <label>
          <span>{t("landing_time")}</span>
          <input type="time" value={val(arrival)} onChange={(e) => onArrival(toMin(e.target.value))} />
        </label>
        <label>
          <span>{t("take_off_time")}</span>
          <input type="time" value={val(departure)} onChange={(e) => onDeparture(toMin(e.target.value))} />
        </label>
      </div>
      <small>{t("we_do_not_guess_flight_times")}</small>
    </div>
  );
}

/** The connector: when you leave, how you go, and so where you end up. */
function Move({
  lang, node, index, chosen, onChoose,
}: {
  lang: Lang;
  node: ChainNode;
  index: string;
  chosen: string | undefined;
  onChoose: (mode: MoveMode) => void;
}) {
  const t = makeT(lang);
  if (!node.via) return null;
  const { modes, minutes, needsTime, bookable } = node.via;

  return (
    <div className={`chain-move ${needsTime ? "needs-time" : ""}`}>
      <span className="chain-move-rail" aria-hidden />
      <div className="chain-move-body">
        <em>{t("how_do_you_go")}</em>
        <div className="chain-move-modes">
          {modes.map((m) => (
            <button key={m} type="button" className={chosen === m ? "active" : ""} onClick={() => onChoose(m)}>
              {t(MODE_KEY[m])}
            </button>
          ))}
          {minutes !== null && <b className="chain-move-min">≈ {minutes}′</b>}
        </div>
        {/* Only the steps a traveler books ahead. See ChainMove.bookable. */}
        {bookable && <AffiliateSlot lang={lang} lineId="intercity" surface="plan" key={index} />}
      </div>
    </div>
  );
}

function Node({ lang, node, open, onToggle }: { lang: Lang; node: ChainNode; open: boolean; onToggle: () => void }) {
  const t = makeT(lang);
  const o = node.option;

  return (
    <div className={`chain-node kind-${node.kind} ${node.carried ? "is-carried" : ""} ${open ? "is-open" : ""}`}>
      <button type="button" className="chain-node-head" onClick={onToggle} aria-expanded={open}>
        <b className="chain-node-clock">{clockText(node.clock)}</b>
        <i className="chain-node-mark" aria-hidden>{KIND_MARK[node.kind]}</i>
        <span className="chain-node-name">
          <strong>{node.ko}</strong>
          <small>{o?.en ?? node.en}</small>
        </span>
        {node.carried && <span className="chain-node-tag">{t("carried_from_yesterday")}</span>}
      </button>

      {node.reason === "gap-before-checkin" && <p className="chain-node-why">{t("because_you_land_early_enough")}</p>}
      {node.reason === "gap-after-checkin" && <p className="chain-node-why">{t("because_check_in_leaves_the_evening")}</p>}

      {open && o && (
        <div className="chain-node-detail">
          <dl>
            <div><dt>{t("opening_hours")}</dt><dd>{o.hoursEn || t("hours_not_published")}</dd></div>
            <div><dt>{t("admission")}</dt><dd>{o.costEn || "—"}</dd></div>
            <div><dt>{t("area")}</dt><dd>{o.zoneKo === o.zoneEn ? o.zoneEn : `${o.zoneKo} ${o.zoneEn}`}</dd></div>
          </dl>
          <p className="chain-node-source">{o.sourceEn}</p>
          {o.category === "food" && <AffiliateSlot lang={lang} lineId="food" surface="plan" />}
        </div>
      )}
      {open && node.kind === "stay" && <AffiliateSlot lang={lang} lineId="stays" surface="plan" />}
    </div>
  );
}

export function DayChain({
  lang, origin, plan, departDate, themes, arrival, departure, onArrival, onDeparture, moves, onMove, extras,
}: {
  lang: Lang;
  origin: string;
  plan: GeneratedPlan | undefined;
  departDate: string;
  themes: Theme[];
  arrival: number | null;
  departure: number | null;
  onArrival: (m: number | null) => void;
  onDeparture: (m: number | null) => void;
  moves: Record<string, string>;
  onMove: (nodeId: string, mode: MoveMode) => void;
  /** Stops the traveler added from inside the trip, keyed by day. */
  extras?: Record<number, JourneyOption[]>;
}) {
  const t = makeT(lang);
  const tf = makeTf(lang);
  const [open, setOpen] = useState<string | null>(null);

  const days: ChainDay[] = buildChain({ origin, plan, departDate, themes, arrival, departure, extras });
  if (!days.length) return null;
  const undecided = openDecisions(days);

  return (
    <article className="panel day-chain">
      <div className="panel-head">
        <div>
          <span>YOUR TRIP</span>
          <h2>{t("your_whole_trip")}</h2>
          <p>{t("from_home_and_back_to_it")}</p>
        </div>
        {undecided > 0 && <b className="chain-open-count">{tf("0_steps_still_undecided", undecided)}</b>}
      </div>

      <FlightTimes lang={lang} arrival={arrival} departure={departure} onArrival={onArrival} onDeparture={onDeparture} />

      <p className="chain-hint">{t("tap_any_step_for_detail")}</p>

      {days.map((day) => (
        <section key={day.n} className="chain-day">
          <header className="chain-day-head">
            <b>{tf("day_0", day.n)}</b>
            <span>{day.date}</span>
            <em>{cityLabel(day.city)}</em>
          </header>

          {day.nodes.map((node, i) => (
            <div key={node.id + i}>
              <Move
                lang={lang}
                node={node}
                index={`${day.n}-${i}`}
                chosen={moves[node.id]}
                onChoose={(m) => onMove(node.id, m)}
              />
              <Node lang={lang} node={node} open={open === node.id + i} onToggle={() => setOpen(open === node.id + i ? null : node.id + i)} />
            </div>
          ))}

          {day.n === 1 && arrival === null && <p className="chain-empty">{t("nothing_is_planned_after_you_land")}</p>}
        </section>
      ))}
    </article>
  );
}
