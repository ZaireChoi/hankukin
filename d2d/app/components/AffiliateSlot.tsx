"use client";

import { makeT, type Lang } from "../i18n";
import {
  PARTNERS,
  LINK_ATTRS,
  buildLink,
  slotFor,
  subId,
  type ClickSurface,
} from "../lib/affiliates";
import { recordClick } from "../lib/click-log";
import type { CostLineId } from "../lib/cost-model";

/**
 * The booking link that sits on a cost line.
 *
 * It appears only where it is useful: the traveler has already decided they
 * need four nights of lodging, and the row showing what that costs is the one
 * place a "book a room" link is help rather than an ad.
 *
 * A slot with no approved partner renders as a muted "coming soon" chip instead
 * of vanishing. Two reasons: the layout does not jump around as programs get
 * approved, and a click on an unapproved chip is recorded as unmet demand —
 * which is the evidence for applying to that program next.
 */
export function AffiliateSlot({
  lang,
  lineId,
  surface = "plan",
}: {
  lang: Lang;
  lineId: CostLineId;
  surface?: ClickSurface;
}) {
  const t = makeT(lang);
  const ids = slotFor(lineId);
  if (ids.length === 0) return null;

  const sub = subId(surface, lineId);

  return (
    <span className="aff-slot">
      {ids.map((id) => {
        const p = PARTNERS.find((x) => x.id === id);
        if (!p) return null;
        const href = buildLink(id, lineId, sub);

        // Approved: a real outbound link, marked sponsored.
        if (href) {
          return (
            <a
              key={id}
              className="aff-link"
              href={href}
              {...LINK_ATTRS}
              onClick={() => recordClick({ subId: sub, partner: id, linked: true })}
            >
              <b>{p.name}</b>
              <span>{t("book_this_line")}</span>
            </a>
          );
        }

        // No link for this line. Either the program is unapproved, or it is
        // approved but does not serve this particular line — Klook has no
        // international air product, for instance. Both cases say so rather
        // than sending the click to a homepage that earns nothing.
        return (
          <button
            key={id}
            type="button"
            className="aff-pending"
            onClick={() => recordClick({ subId: sub, partner: id, linked: false })}
            title={p.labels[lang]}
          >
            <b>{p.name}</b>
            <span>{p.status === "applied" ? t("partner_pending") : t("partner_not_yet")}</span>
          </button>
        );
      })}
    </span>
  );
}

/**
 * The disclosure. One line, in the panel, above the links — not in a footer
 * three scrolls away. It is a legal requirement and also the reason the links
 * are worth clicking: the traveler can see exactly what we get out of it.
 */
export function AffiliateDisclosure({ lang }: { lang: Lang }) {
  const t = makeT(lang);
  return (
    <p className="aff-disclosure">
      <b>{t("affiliate_disclosure_title")}</b> {t("affiliate_disclosure_body")}
    </p>
  );
}
