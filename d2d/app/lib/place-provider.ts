import type { JourneyOption } from "./types";
import { optionsForCities, citiesWithoutData } from "../data/places";

/**
 * Where places come from.
 *
 * Hand-authoring every place in Korea does not scale and cannot stay current.
 * The Korea Tourism Organization publishes TourAPI through 공공데이터포털:
 * official place records with coordinates, category, address and operating
 * information, in 9 languages, free of charge. That is the right source for a
 * one-person operation — it is official (so it satisfies the "never mix
 * verified facts with AI estimates" rule) and it is already multilingual (so it
 * matches the i18n split: names come from the source, UI comes from app/i18n).
 *
 * This module is the seam. Views never import a city file directly; they ask
 * the provider. Swapping the local registry for TourAPI later touches only this
 * file.
 *
 * Not wired yet on purpose — it needs a service key, and the handoff rule is
 * that no API key, paid service or partner program gets added without the
 * operator's explicit decision.
 */

export type PlaceQuery = {
  /** Korean city names as chosen in the picker, e.g. ["서울", "경주"]. */
  cities: readonly string[];
};

export type PlaceResult = {
  options: JourneyOption[];
  /** Cities we returned nothing for. The UI must show these, not hide them. */
  missing: string[];
};

export interface PlaceProvider {
  readonly id: string;
  getOptions(query: PlaceQuery): Promise<PlaceResult> | PlaceResult;
}

/**
 * Current provider: the local registry, now holding the national ingest.
 *
 * `missing` used to be computed from a three-entry lookup table hardcoded in
 * this file, so every city outside 서울·경주·부산 was reported as having no
 * data — including the ones that did. A city is missing when it yields no
 * options, and nothing else decides it.
 */
export const localProvider: PlaceProvider = {
  id: "local-registry",
  getOptions({ cities }) {
    return {
      options: optionsForCities(cities),
      missing: citiesWithoutData(cities),
    };
  },
};

/**
 * TourAPI adapter — outline only.
 *
 * Endpoint family: areaBasedList / detailCommon / detailIntro on the KTO
 * service, one host per language (국문 / 영문 / 日文 / 中文 …). Records carry
 * mapx / mapy coordinates, contentTypeId category, address and overview.
 *
 * Before enabling:
 *   1. Register at data.go.kr and obtain a service key (free, reviewed).
 *   2. Confirm the redistribution and attribution terms for the fields used.
 *   3. Decide the cache policy — the daily call quota is finite, and a
 *      traveler opening a plan must not trigger a live call per place.
 *   4. Keep the checked date on every record; TourAPI hours and fees change.
 *
 * Anything TourAPI does not answer (dwell time, walking load, meal budget)
 * stays a planning estimate and must remain visually separate from official
 * fields, exactly as the current rows do with sourceKo / sourceEn.
 */
export const tourApiProvider = {
  id: "kto-tourapi",
  enabled: false,
  docs: "https://www.data.go.kr/data/15101753/openapi.do",
  note: "Requires a data.go.kr service key. Do not enable without operator approval.",
} as const;

export const placeProvider: PlaceProvider = localProvider;
