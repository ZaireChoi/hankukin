import type { Lang } from "../i18n";
import type { CostLineId } from "./cost-model";

/**
 * Where the money comes from — and the rules that keep it from corrupting the plan.
 *
 * Door to Door carries no advertising. The only revenue surface is a link on a
 * cost line the traveler is already looking at: they have decided they need a
 * bed for four nights, and here is where to book one. That is the whole model.
 *
 * Four constraints are load-bearing, and each is enforced by code below rather
 * than by good intentions:
 *
 *   1. LINK-OUT ONLY. We never take the booking, the payment, or the refund.
 *      The moment we do we are a travel agency under 관광진흥법 and this is a
 *      one-person operation. `TRANSACTION_ROLE` states it; nothing here builds
 *      a cart.
 *
 *   2. NEVER SORT BY COMMISSION. Partners for a line are listed in a fixed
 *      order chosen by fit. There is no rate field in this file, so no future
 *      edit can quietly sort by one.
 *
 *   3. NO SLOT WITHOUT A PARTNER. A line with no approved partner renders as
 *      an empty slot, not as a plausible-looking link. Food has no slot on
 *      purpose — there is no commission on a ₩4,000 호떡, and inventing one
 *      would mean steering people to restaurants that pay.
 *
 *   4. DISCLOSED, ALWAYS. `rel="sponsored"` on every link and a visible notice
 *      in the panel. Required by 표시·광고의 공정화에 관한 법률 and by Google's
 *      link policy, and it is the thing that makes the tool trustworthy enough
 *      to be worth clicking.
 */

export type PartnerId = "trip-com" | "agoda" | "klook";

/**
 * Where we actually stand with each program. `live` is the only state that
 * produces a URL — see `buildLink`.
 */
export type PartnerStatus = "live" | "applied" | "not-applied";

export type Partner = {
  id: PartnerId;
  name: string;
  status: PartnerStatus;
  /**
   * The landing page for each cost line this partner serves.
   *
   * A partner does not get one URL. Someone looking at the international air
   * line wants a flight search; someone looking at the stays line wants hotels.
   * Sending both to a homepage wastes the click and the intent.
   *
   * These are CATEGORY pages, not routes or dates. The traveler's own dates and
   * cities stay on their device — we hand over the intent, not the itinerary.
   */
  landing: Partial<Record<CostLineId, string>>;
  /** Query parameters that identify us to the program. */
  params: Record<string, string>;
  /**
   * The query key that carries our own sub-identifier, so we can tell a click
   * from an article apart from a click from a plan line.
   *
   * Left undefined until the key is confirmed against the program's own tool.
   * An unverified key silently drops the attribution; we would rather have no
   * parameter and keep the click in our own log.
   */
  subIdParam?: string;
  labels: Record<Lang, string>;
};

const L = (en: string, ko: string, ja: string, zhHans: string, zhHant: string): Record<Lang, string> =>
  ({ en, ko, ja, "zh-Hans": zhHans, "zh-Hant": zhHant });

/**
 * One Klook redirect, pre-generated per cost line.
 *
 * The destination is Klook's South Korea page rather than a city page: a plan
 * can run Seoul → Gyeongju → Busan → Jeju, and pinning the link to one city
 * would be wrong for every other stop. Country level is the narrowest target
 * that is right for all of them.
 */
const KLOOK_KR = (adId: string) =>
  `https://affiliate.klook.com/redirect?aid=131289&aff_adid=${adId}` +
  `&k_site=${encodeURIComponent("https://www.klook.com/en-US/coureg/10-south-korea-things-to-do/")}`;

/**
 * Trip.com's parameters, read off links generated in their own Affiliate Link
 * tool on 2026-08-17 rather than guessed:
 *
 *   https://www.trip.com/flights/?Allianceid=10114476&SID=328673514
 *     &trip_sub1=d2d.plan.international-air&trip_sub3=D19288278
 *
 * `trip_sub3` was identical across all three generated links, so it identifies
 * the site rather than the link — which is why it lives here as a fixed
 * parameter instead of being generated per cost line.
 */
const TRIPCOM_PARAMS = {
  Allianceid: "10114476",
  SID: "328673514",
  trip_sub3: "D19288278",
} as const;

export const PARTNERS: Partner[] = [
  {
    id: "trip-com",
    name: "Trip.com",
    status: "live",
    landing: {
      "international-air": "https://www.trip.com/flights/",
      stays: "https://www.trip.com/hotels/",
      intercity: "https://www.trip.com/trains/",
    },
    params: { ...TRIPCOM_PARAMS },
    subIdParam: "trip_sub1",
    labels: L("Flights & rail", "항공·철도", "航空・鉄道", "机票与铁路", "機票與鐵路"),
  },
  {
    id: "agoda",
    name: "Agoda",
    // Partner account exists; site 1972799 is pending manual domain review.
    status: "applied",
    landing: {},
    params: {},
    labels: L("Stays", "숙박", "宿泊", "住宿", "住宿"),
  },
  {
    id: "klook",
    name: "Klook",
    // Already running on hankuk-in.com — the eSIM article uses this same aid.
    status: "live",
    /**
     * Klook does not take a sub-identifier in the URL.
     *
     * Their link tool accepts a "custom tag", stores it server-side, and hands
     * back a numeric `aff_adid` instead. So the tag we typed
     * (`d2d.plan.experiences`) never appears in the link — it is what the
     * reports show for ad id 1388616.
     *
     * The consequence is that these URLs cannot be built from a template.
     * Each one was generated on 2026-08-17 and must be regenerated in the
     * portal if the destination changes. Hence full URLs, not fragments.
     */
    landing: {
      experiences: KLOOK_KR("1388616"),
      "local-transport": KLOOK_KR("1388620"),
      "arrival-transfer": KLOOK_KR("1388621"),
      "departure-transfer": KLOOK_KR("1388622"),
      intercity: KLOOK_KR("1388623"),
    },
    params: {},
    labels: L("Experiences & transport", "체험·교통", "体験・交通", "体验与交通", "體驗與交通"),
  },
];

export const partner = (id: PartnerId) => PARTNERS.find((p) => p.id === id);

/**
 * Which partners belong on which cost line.
 *
 * Order is fit, not rate. Some lines are deliberately empty:
 *
 *   · food             — no commission exists on street food, and steering
 *                        people toward restaurants that pay is the exact
 *                        failure this product is supposed to avoid.
 *   · the home legs    — home→airport, parking, airport→home all happen in the
 *                        traveler's own country, where we know nothing and have
 *                        no partner.
 *   · buffer           — it is money set aside, not a thing to buy.
 */
export const SLOTS: Partial<Record<CostLineId, PartnerId[]>> = {
  "international-air": ["trip-com"],
  stays: ["agoda", "trip-com"],
  intercity: ["trip-com", "klook"],
  "arrival-transfer": ["klook"],
  "departure-transfer": ["klook"],
  "local-transport": ["klook"],
  experiences: ["klook"],
};

export const slotFor = (id: CostLineId): PartnerId[] => SLOTS[id] ?? [];

/**
 * Sub-identifier — which surface produced this click.
 *
 * The point is to be able to say "the stays line converts, the experiences line
 * does not" instead of one undifferentiated total. So the shape is
 * `<surface>.<slot>`:
 *
 *   d2d.plan.stays          a cost line inside the planner
 *   d2d.live.local          the live tab
 *   hankukin.article.esim   an article on the main site
 *
 * Nothing about the traveler goes in here. It identifies our own page, not
 * them — no origin country, no dates, no party size.
 */
export type ClickSurface = "plan" | "live" | "saved" | "article";

export function subId(surface: ClickSurface, slot: string): string {
  const clean = (s: string) => s.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  return surface === "article"
    ? `hankukin.article.${clean(slot)}`
    : `d2d.${surface}.${clean(slot)}`;
}

/**
 * The outbound URL, or null when we have nothing to send anyone to.
 *
 * Null is still the normal case for Agoda: the account exists but the domain
 * review has not cleared, so there is no landing page and no link. A null slot
 * renders as "approval pending", which is true, rather than as a bare link to
 * the partner's homepage, which would earn nothing and look like an ad.
 */
export function buildLink(id: PartnerId, lineId: CostLineId, sub: string): string | null {
  const p = partner(id);
  if (!p || p.status !== "live") return null;
  const landing = p.landing[lineId];
  if (!landing) return null;
  const url = new URL(landing);
  for (const [key, value] of Object.entries(p.params)) url.searchParams.set(key, value);
  if (p.subIdParam) url.searchParams.set(p.subIdParam, sub);
  return url.toString();
}

/** Every affiliate link carries these. `sponsored` is not optional. */
export const LINK_ATTRS = {
  target: "_blank",
  rel: "sponsored noopener noreferrer",
} as const;

/**
 * How each program tells one of our surfaces apart from another.
 *
 * This is not one mechanism. Trip.com takes a string in the URL; Klook takes a
 * pre-registered ad id and keeps our label on their side; Agoda gives us
 * nothing until the domain review clears. A boolean would flatten that into
 * something misleading, so the mechanism is named.
 */
export const ATTRIBUTION: Record<PartnerId, { mechanism: string; note: string }> = {
  "trip-com": {
    mechanism: "url-parameter",
    note: "trip_sub1 — read from a generated link, 2026-08-17. Dots pass through unchanged.",
  },
  klook: {
    mechanism: "pregenerated-ad-id",
    note: "aff_adid per cost line. The custom tag lives in Klook's reports, not the URL.",
  },
  agoda: {
    mechanism: "none",
    note: "Nothing to attribute until site 1972799 clears manual domain review.",
  },
};

/** Stated once, so no later change can drift away from it without noticing. */
export const TRANSACTION_ROLE = {
  weTakePayment: false,
  weIssueTickets: false,
  weHandleRefunds: false,
  note: "Referral only. Taking the booking would make this a registered travel business.",
} as const;

/**
 * Things Trip.com's cooperation agreement forbids that this product could
 * plausibly drift into. Kept next to the links so the constraint is visible
 * where the temptation is.
 *
 *   · 3.2.4(i)  Their content may not be combined with ours without written
 *               approval — so no pulling live Trip.com fares into the cost
 *               table, however much better that table would look.
 *   · 3.2.4(iii) Their content may not be published on "Restricted Platforms",
 *               which their definitions include social networks and blogs.
 *   · 3.2.5     No paid search, and no promotional push notifications — which
 *               matters because this app is a PWA and could send them.
 *   · 9.2       Their logo needs written consent. The name as plain text does
 *               not, which is why the CTA renders text and no image.
 */
export const PARTNER_CONTENT_RULES = {
  mayEmbedLiveFares: false,
  mayPublishOnSocial: false,
  mayRunPaidSearch: false,
  mayUsePartnerLogo: false,
  note: "Trip.com Online Cooperation Agreement, clauses 3.2.4, 3.2.5 and 9.2.",
} as const;

/** Shown in the panel, not buried in a footer. */
export const DISCLOSURE_REQUIRED = true;
