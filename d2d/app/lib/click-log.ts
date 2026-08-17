/**
 * Which cost line produces clicks.
 *
 * Roadmap 1-2 asks for one number per line: does the stays row convert, does
 * the experiences row convert, does anyone ever touch intercity. Without that,
 * the affiliate revenue is a single total that cannot be acted on.
 *
 * This is deliberately the smallest thing that answers the question:
 *
 *   · no third-party analytics script — the tool carries no ads and no trackers
 *   · no personal data — surface and slot only, never the traveler's origin,
 *     dates, party size, or home address
 *   · no endpoint yet — events queue in memory until one is connected, and
 *     `ENDPOINT_STATUS` says so out loud rather than pretending they are sent
 *
 * When an endpoint does exist it receives counts, not sessions. We want to know
 * that the stays row is clicked; we do not want to know who clicked it.
 */

import type { PartnerId } from "./affiliates";

export type ClickEvent = {
  /** `d2d.plan.stays` — our own page, not the person on it. */
  subId: string;
  partner: PartnerId;
  /** Whether a URL actually existed. Impressions on empty slots matter too:
   *  a slot clicked often while unapproved is an argument for applying. */
  linked: boolean;
};

const queue: ClickEvent[] = [];

export function recordClick(event: ClickEvent): void {
  queue.push(event);
}

/** Counts per sub-id — the shape a weekly dashboard actually wants. */
export function tally(): Record<string, number> {
  return queue.reduce<Record<string, number>>((acc, e) => {
    acc[e.subId] = (acc[e.subId] ?? 0) + 1;
    return acc;
  }, {});
}

/** Clicks on slots we cannot yet fill. This is the "apply to them next" list. */
export function unmetDemand(): Record<PartnerId, number> {
  return queue
    .filter((e) => !e.linked)
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.partner] = (acc[e.partner] ?? 0) + 1;
      return acc;
    }, {}) as Record<PartnerId, number>;
}

export const drain = (): ClickEvent[] => queue.splice(0, queue.length);

export const ENDPOINT_STATUS = {
  connected: false,
  note: "Events are held in memory. Connect a first-party endpoint before relying on these counts.",
} as const;

/** What must never enter an event, restated where the code can be checked against it. */
export const NEVER_LOGGED = [
  "home address",
  "origin country",
  "travel dates",
  "party size",
  "any identifier for the person",
] as const;
