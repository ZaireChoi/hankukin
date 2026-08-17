"use client";

import { makeT, type Lang } from "../i18n";
import {
  hoursProvenance,
  timeAndCostProvenance,
  checkedOn,
  provenanceKey,
  type Provenance,
} from "../lib/provenance";
import type { JourneyOption } from "../lib/types";

/**
 * Make the difference visible.
 *
 * The rule — 확인된 정보와 추정치를 절대 섞어 표시하지 않는다 — is only real if a
 * traveler can tell the two apart at a glance. A badge does that; a footnote
 * does not.
 *
 * Colour is not doing the work on its own. Each badge carries its own word, so
 * the meaning survives a screenshot, a colour-blind reader and a printout.
 */
export function ProvenanceBadge({
  kind,
  date,
  lang,
}: {
  kind: Provenance;
  date?: string | null;
  lang: Lang;
}) {
  const t = makeT(lang);
  return (
    <span className={`prov prov-${kind}`}>
      {t(provenanceKey(kind))}
      {kind === "official" && date && <span className="prov-date">{date}</span>}
    </span>
  );
}

/**
 * The row under an option: where the hours came from, and a standing reminder
 * that the minutes and the money next to them are ours, not the source's.
 */
export function OptionProvenance({ option, lang }: { option: JourneyOption; lang: Lang }) {
  const hours = hoursProvenance(option);
  const t = makeT(lang);
  return (
    <div className="prov-row">
      <ProvenanceBadge kind={hours} date={checkedOn(option)} lang={lang} />
      <ProvenanceBadge kind={timeAndCostProvenance()} lang={lang} />
      <small className="prov-note">
        {hours === "official" ? t("official_hours_dated") : t("hours_not_published")}
      </small>
    </div>
  );
}
