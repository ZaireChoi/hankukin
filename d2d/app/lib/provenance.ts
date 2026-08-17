import type { JourneyOption } from "./types";

/**
 * Is this fact official, or is it our estimate?
 *
 * The handoff states the rule plainly: 실제 확인된 정보와 AI 추정치를 절대 섞어
 * 표시하지 않는다. Enforcing that needs one function everybody calls, not a
 * judgement made separately in each component.
 *
 * The distinction is per FIELD, not per place. A single row can hold an
 * official name, official hours, and an invented dwell time all at once.
 */
export type Provenance = "official" | "needs-check" | "estimate";

/**
 * What makes a fact official.
 *
 * Not the word 공식 — "공식 가격 아님" contains it and means the opposite. Two
 * things have to hold together:
 *
 *   1. the source names an authority (or the API operation that returned it), and
 *   2. it carries the date someone actually looked.
 *
 * An undated claim is not official, however confident it sounds. Hours change,
 * and a 공식 label with no date cannot be audited or refreshed.
 *
 * This deliberately accepts BOTH machine-enriched rows (detailIntro2) and rows
 * a human checked against a city or museum page — the Gyeongju set was verified
 * by hand and is no less official for it.
 */
const DENIAL = /아님|아닙니다|미대조|미확인|확인 필요|not an official|needs check|unverified/i;
const AUTHORITY = /detailIntro2|공식|경주시|한국관광공사|박물관|시청|관광안내|KTO|official/i;
const DATED = /\d{4}[-.]\d{2}[-.]\d{2}/;

export const hoursProvenance = (o: Pick<JourneyOption, "sourceKo" | "hoursKo">): Provenance => {
  const source = o.sourceKo ?? "";
  if (DENIAL.test(source)) return "needs-check";
  if (AUTHORITY.test(source) && DATED.test(source)) return "official";
  return "needs-check";
};

/**
 * Dwell time, transfer time, meal budgets and walking load are never official —
 * TourAPI does not publish them and no API does. They are ours, and they must
 * look like ours.
 */
export const timeAndCostProvenance = (): Provenance => "estimate";

/** The date stamped into the source string, if any. */
export const checkedOn = (o: Pick<JourneyOption, "sourceKo">): string | null =>
  (o.sourceKo ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;

/** Translation key for the badge. One place decides the wording. */
export const provenanceKey = (p: Provenance) =>
  p === "official" ? "official" : p === "needs-check" ? "needs_check" : "planning_estimate";
