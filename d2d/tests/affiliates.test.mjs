import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const aff = readFileSync("app/lib/affiliates.ts", "utf8");
const log = readFileSync("app/lib/click-log.ts", "utf8");
const slot = readFileSync("app/components/AffiliateSlot.tsx", "utf8");
const plan = readFileSync("app/views/PlanView.tsx", "utf8");

/**
 * These guard the four rules the money model rests on. Each one is a rule that
 * a well-meaning future edit could break without anything looking wrong.
 */

test("no commission rate lives in the affiliate registry", () => {
  // If a rate field ever exists, someone eventually sorts by it.
  assert.ok(
    !/\b(commission|rate|payout|cpa|epc)\s*[:=]/i.test(aff),
    "a rate field in affiliates.ts invites sorting slots by what they pay",
  );
});

test("only a live partner with a landing page produces a URL", () => {
  assert.match(aff, /status !== "live"[\s\S]{0,30}return null/);
  assert.match(aff, /if \(!landing\) return null/);
  // An unapproved partner must have nowhere to send a click.
  const notLive = [...aff.matchAll(/status: "(applied|not-applied)",\s*\n\s*landing: \{([^}]*)\}/g)];
  assert.equal(notLive.length, 1, "expected exactly one unapproved partner (Agoda)");
  for (const [, , landing] of notLive) {
    assert.equal(landing.trim(), "", "an unapproved partner must have no landing pages");
  }
});

test("a live partner only serves lines it actually has a product for", () => {
  // Klook sells transfers and experiences, not international air. Listing it
  // on that line would render a chip that can never become a link.
  const klook = aff.slice(aff.indexOf('id: "klook"'), aff.indexOf("export const partner"));
  assert.ok(!/"international-air":/.test(klook), "Klook must not claim the international air line");
});

test("food and the home legs carry no affiliate slot", () => {
  const body = aff.slice(aff.indexOf("export const SLOTS"), aff.indexOf("export const slotFor"));
  for (const id of ["food", "home-to-airport", "airport-parking", "airport-to-home", "buffer"]) {
    assert.ok(!new RegExp(`["']?${id}["']?\\s*:`).test(body), `${id} must not have an affiliate slot`);
  }
});

test("every outbound link is marked sponsored and opens safely", () => {
  assert.match(aff, /rel: "sponsored noopener noreferrer"/);
  assert.match(slot, /\{\.\.\.LINK_ATTRS\}/);
  // No hand-rolled anchor may bypass the shared attributes.
  const anchors = [...slot.matchAll(/<a\b/g)].length;
  const spread = [...slot.matchAll(/\{\.\.\.LINK_ATTRS\}/g)].length;
  assert.equal(anchors, spread, "every <a> in AffiliateSlot must spread LINK_ATTRS");
});

test("the disclosure renders in the cost panel, not only in a footer", () => {
  assert.match(plan, /<AffiliateDisclosure lang=\{lang\}\/>/);
  const panel = plan.slice(plan.indexOf("cost-panel"), plan.indexOf("lodging-panel"));
  assert.ok(panel.includes("AffiliateDisclosure"), "disclosure must sit inside the cost panel");
  assert.ok(panel.includes("AffiliateSlot"), "slots must sit inside the cost panel");
});

test("sub-ids separate the planner from articles", () => {
  assert.match(aff, /hankukin\.article\./);
  assert.match(aff, /`d2d\.\$\{surface\}\.\$\{clean\(slot\)\}`/);
});

test("the click log records nothing about the traveler", () => {
  const eventType = log.slice(log.indexOf("export type ClickEvent"), log.indexOf("const queue"));
  for (const forbidden of ["country", "origin", "date", "party", "address", "email", "ip"]) {
    assert.ok(
      !new RegExp(`^\\s*${forbidden}\\w*\\s*[?]?:`, "im").test(eventType),
      `ClickEvent must not carry ${forbidden}`,
    );
  }
});

test("we never become the transaction party", () => {
  assert.match(aff, /weTakePayment: false/);
  assert.match(aff, /weIssueTickets: false/);
  assert.match(aff, /weHandleRefunds: false/);
});

test("a sub-id key is only emitted once it is verified", () => {
  // Guessing a key means the parameter is ignored, or breaks the whole click's
  // attribution. Only Trip.com's key has been read off a generated link.
  const declared = [...aff.matchAll(/id: "([a-z-]+)",[\s\S]{0,1400}?subIdParam: "([^"]+)"/g)]
    .map(([, id]) => id);
  assert.deepEqual(declared, ["trip-com"], "only Trip.com's sub-id key is confirmed so far");
  assert.match(aff, /if \(p\.subIdParam\) url\.searchParams\.set/);
});

test("each partner's attribution mechanism is named, not flattened to a boolean", () => {
  const block = aff.slice(aff.indexOf("export const ATTRIBUTION"));
  assert.match(block, /"trip-com":[\s\S]{0,80}mechanism: "url-parameter"/);
  assert.match(block, /klook:[\s\S]{0,80}mechanism: "pregenerated-ad-id"/);
  assert.match(block, /agoda:[\s\S]{0,80}mechanism: "none"/);
});

test("no two Klook cost lines share an ad id", () => {
  // Klook keeps our per-line label against aff_adid, so a duplicated id
  // silently merges two lines in their reports and the split is lost.
  const klook = aff.slice(aff.indexOf('id: "klook"'), aff.indexOf("export const partner"));
  const ids = [...klook.matchAll(/KLOOK_KR\("(\d+)"\)/g)].map(([, id]) => id);
  assert.ok(ids.length >= 5, "expected a Klook link per served cost line");
  assert.equal(new Set(ids).size, ids.length, `duplicate aff_adid among ${ids.join(", ")}`);
});

test("partner content rules that could be broken by a future feature are stated", () => {
  // Each of these is something this product could plausibly drift into, and
  // each is a material breach under the Trip.com agreement.
  for (const rule of [
    "mayEmbedLiveFares: false",
    "mayPublishOnSocial: false",
    "mayRunPaidSearch: false",
    "mayUsePartnerLogo: false",
  ]) {
    assert.ok(aff.includes(rule), `PARTNER_CONTENT_RULES must state ${rule}`);
  }
  // The logo rule is kept honest by the CTA rendering text, never an image.
  assert.ok(!/<img/.test(slot), "the affiliate CTA must not render a partner logo");
});
