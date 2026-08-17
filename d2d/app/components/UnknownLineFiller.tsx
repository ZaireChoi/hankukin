"use client";

import { makeT, type Lang } from "../i18n";
import { formatWon } from "../lib/format";
import { TRANSFER_OPTIONS, type TransferMode } from "../data/airport-transfer";
import type { CostLineId } from "../lib/cost-model";

/**
 * Turn "아직 추정하지 않음" into a number the traveler owns.
 *
 * Four lines stay unknown after the mode question: the two door legs at home,
 * and the two airport transfers in Korea. This is where they get filled.
 *
 * The design rule here is that we never pre-fill a plausible-looking figure.
 * An empty field says "we do not know"; a filled one says "you told us". Both
 * are honest. A guessed fare dressed up as an estimate is neither.
 */

export type LegAmounts = Partial<Record<CostLineId, number>>;

export function UnknownLineFiller({
  lang,
  amounts,
  onAmount,
  transferMode,
  onTransferMode,
  sameOnReturn,
  onSameOnReturn,
}: {
  lang: Lang;
  amounts: LegAmounts;
  onAmount: (id: CostLineId, value: number | null) => void;
  transferMode: TransferMode | null;
  onTransferMode: (m: TransferMode) => void;
  sameOnReturn: boolean;
  onSameOnReturn: (v: boolean) => void;
}) {
  const t = makeT(lang);

  const field = (id: CostLineId, label: string, disabled = false) => (
    <label className={`leg-amount ${disabled ? "is-disabled" : ""}`}>
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1000}
        disabled={disabled}
        value={amounts[id] ?? ""}
        placeholder={t("amount_in_won")}
        onChange={(e) => {
          const v = e.target.value.trim();
          onAmount(id, v === "" ? null : Number(v));
        }}
      />
    </label>
  );

  return (
    <section className="unknown-filler">
      <header>
        <strong>{t("fill_the_remaining_lines")}</strong>
        <small>{t("we_do_not_guess_fares")}</small>
      </header>

      {/* ── Korea side: we know the options, not the fares ── */}
      <div className="filler-block">
        <p className="filler-label">{t("airport_transfer_in_korea")}</p>
        <div className="transfer-modes">
          {TRANSFER_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={transferMode === o.id ? "active" : ""}
              onClick={() => {
                onTransferMode(o.id);
                if (o.id === "pickup") {
                  onAmount("arrival-transfer", 0);
                  onAmount("departure-transfer", 0);
                }
              }}
            >
              <span>{o.labels[lang]}</span>
              <em className={`lug lug-${o.luggage}`}>{t(`luggage_${o.luggage}` as never)}</em>
            </button>
          ))}
        </div>
        {transferMode && (
          <p className="transfer-note">
            {TRANSFER_OPTIONS.find((o) => o.id === transferMode)?.notes[lang]}
          </p>
        )}
        {transferMode && transferMode !== "pickup" && (
          <div className="filler-fields">
            {field("arrival-transfer", t("arrival_to_first_stay"))}
            {field("departure-transfer", t("last_stay_to_airport"))}
          </div>
        )}
      </div>

      {/* ── Home side: only the traveler knows ── */}
      <div className="filler-block">
        <p className="filler-label">{t("your_own_city")}</p>
        <div className="filler-fields">
          {field("home-to-airport", t("home_to_airport_amount"))}
          {field("airport-to-home", t("airport_to_home_amount"), sameOnReturn)}
        </div>
        <label className="same-return">
          <input
            type="checkbox"
            checked={sameOnReturn}
            onChange={(e) => {
              onSameOnReturn(e.target.checked);
              if (e.target.checked && typeof amounts["home-to-airport"] === "number") {
                onAmount("airport-to-home", amounts["home-to-airport"]);
              }
            }}
          />
          <span>{t("same_on_the_way_back")}</span>
        </label>
      </div>

      <p className="filler-total">
        {t("you_have_supplied")}{" "}
        <strong>
          {formatWon(
            (["arrival-transfer", "departure-transfer", "home-to-airport", "airport-to-home"] as CostLineId[])
              .reduce((sum, id) => sum + (amounts[id] ?? 0), 0),
          )}
        </strong>
      </p>
    </section>
  );
}
