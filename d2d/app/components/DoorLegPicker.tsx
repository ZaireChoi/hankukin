"use client";

import { makeT, type Lang } from "../i18n";
import { formatWon } from "../lib/format";
import { HOME_AIRPORT_MODES, parkingDays, type HomeAirportMode } from "../data/journey-legs";

/**
 * The question the budget could not answer on its own.
 *
 * Everything else in the plan is about Korea. This one is about the traveler's
 * own city, which we know nothing about — the distance to their airport, the
 * local fare, the currency, what parking costs there. So we ask instead of
 * guessing, and the total stays honestly incomplete until they answer.
 *
 * Parking gets its own input because it is the line people forget: it scales
 * with the length of the whole trip, not with the drive.
 */
export function DoorLegPicker({
  lang,
  mode,
  onMode,
  parkingPerDay,
  onParkingPerDay,
  departISO,
  returnISO,
}: {
  lang: Lang;
  mode: HomeAirportMode | null;
  onMode: (m: HomeAirportMode) => void;
  parkingPerDay: number | null;
  onParkingPerDay: (n: number | null) => void;
  departISO: string;
  returnISO: string;
}) {
  const t = makeT(lang);
  const days = parkingDays(departISO, returnISO);

  return (
    <section className="door-leg-picker">
      <header>
        <strong>{t("how_do_you_get_to_your_airport")}</strong>
        <small>{t("door_legs_explained")}</small>
      </header>

      <div className="door-leg-modes">
        {HOME_AIRPORT_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={mode === m.id ? "active" : ""}
            onClick={() => onMode(m.id)}
          >
            <span>{m.labels[lang]}</span>
            {/* What actually drives the number, so the estimate is inspectable. */}
            {m.drivers.length > 0 && <em>{m.drivers.join(" · ")}</em>}
          </button>
        ))}
      </div>

      {mode === "own-car" && (
        <label className="parking-input">
          <span>{t("parking_per_day")}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={parkingPerDay ?? ""}
            placeholder="15000"
            onChange={(e) => {
              const v = e.target.value.trim();
              onParkingPerDay(v === "" ? null : Number(v));
            }}
          />
          {/* An 8-night trip parks 9 days. Show the arithmetic, do not hide it. */}
          <small>
            {t("parking_days_note").replace("{0}", String(days))}
            {parkingPerDay ? ` · ${formatWon(parkingPerDay * days)}` : ""}
          </small>
        </label>
      )}

      {mode === "dropoff" && <p className="door-leg-note">{t("dropoff_means_zero")}</p>}
    </section>
  );
}
