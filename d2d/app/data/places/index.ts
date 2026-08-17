import type { JourneyOption, CityId } from "../../lib/types";
import { gyeongjuOptions } from "./gyeongju";
import { seoulOptions } from "./seoul";
import { busanOptions } from "./busan";
import { GENERATED_CITIES, GENERATED_COORDINATES } from "./generated";

/**
 * Korea is not one city.
 *
 * The prototype shipped 18 Gyeongju options as if they were the product, so
 * choosing Seoul still offered 첨성대. Options are now keyed by city, and a
 * city with no data says so instead of borrowing another city's places.
 *
 * Coverage is deliberately visible in the UI (see coverageOf) because a wrong
 * place is worse than a missing one.
 */

/** How much we can honestly claim about a city. */
export type Coverage =
  | "verified"   // hours and fees matched to an official page, with a date
  | "seeded"     // shape and planning estimates only — marked 확인 필요 in the UI
  | "none";      // no place data yet

type CityEntry = {
  id: CityId;
  ko: string;
  en: string;
  coverage: Coverage;
  options: JourneyOption[];
};

/** Hand-checked cities. These outrank anything generated with the same id. */
const CURATED: CityEntry[] = [
  { id: "gyeongju", ko: "경주", en: "Gyeongju", coverage: "verified", options: gyeongjuOptions },
  { id: "seoul", ko: "서울", en: "Seoul", coverage: "seeded", options: seoulOptions },
  { id: "busan", ko: "부산", en: "Busan", coverage: "seeded", options: busanOptions },
];

/**
 * Curated first, then everything the ingest produced. A city that exists in
 * both keeps its hand-checked rows and gains the generated ones — a verified
 * place should never be replaced by an unverified one with the same name.
 */
const CITIES: CityEntry[] = (() => {
  const byId = new Map(CURATED.map((c) => [c.id, { ...c }]));
  for (const g of GENERATED_CITIES) {
    const existing = byId.get(g.id);
    if (existing) {
      const seen = new Set(existing.options.map((o) => o.id));
      existing.options = [...existing.options, ...g.options.filter((o) => !seen.has(o.id))];
    } else {
      byId.set(g.id, { id: g.id, ko: g.ko, en: g.en, coverage: "seeded", options: g.options });
    }
  }
  return [...byId.values()];
})();

/** Korean display name -> city id, so the existing city picker keeps working. */
const BY_KO = new Map(CITIES.map((c) => [c.ko, c.id]));

export const cityIdFromKorean = (korean: string): CityId | undefined => BY_KO.get(korean);

export const coverageOf = (city: CityId | undefined): Coverage =>
  CITIES.find((c) => c.id === city)?.coverage ?? "none";

export const cityEntry = (city: CityId) => CITIES.find((c) => c.id === city);

/**
 * The picker asks for cities; TourAPI answers by province.
 *
 * 강릉 is not an areaCode — it is 262 rows inside 강원특별자치도, and the only
 * thing that says which ones is the address. The English catalogue writes that
 * address in romanized form ("131 Nanseolheon-ro, Gangneung-si, Gangwon-do"),
 * so the city a place belongs to is matched on the romanized stem.
 *
 * This table is the picker's cities, not a general gazetteer. A name that is
 * not here simply has no data, which is what `citiesWithoutData` reports.
 */
const CITY_ROMAN: Record<string, string> = {
  서울: "Seoul", 인천: "Incheon", 수원: "Suwon", 용인: "Yongin", 가평: "Gapyeong", 파주: "Paju",
  강릉: "Gangneung", 속초: "Sokcho", 춘천: "Chuncheon", 평창: "Pyeongchang", 원주: "Wonju", 동해: "Donghae",
  대전: "Daejeon", 공주: "Gongju", 부여: "Buyeo", 단양: "Danyang", 제천: "Jecheon", 천안: "Cheonan",
  전주: "Jeonju", 광주: "Gwangju", 여수: "Yeosu", 순천: "Suncheon", 목포: "Mokpo", 군산: "Gunsan", 담양: "Damyang",
  경주: "Gyeongju", 부산: "Busan", 대구: "Daegu", 안동: "Andong", 통영: "Tongyeong", 거제: "Geoje",
  진주: "Jinju", 울산: "Ulsan", 포항: "Pohang", 제주시: "Jeju", 서귀포: "Seogwipo",
};

const EVERY_OPTION = CITIES.flatMap((c) => c.options);

/** Places whose address puts them in this city, wherever they were ingested. */
function optionsByAddress(korean: string): JourneyOption[] {
  const roman = CITY_ROMAN[korean];
  if (!roman) return [];
  const re = new RegExp(`\\b${roman}(-si|-gun|-gu)?\\b`, "i");
  return EVERY_OPTION.filter((o) => re.test(o.zoneEn));
}

/**
 * Every option for the selected cities, in the order the user picked them.
 *
 * Both routes are used and the result is deduped: 경주 is a hand-checked city
 * of its own AND a set of rows inside 경상북도. Taking only the first would
 * throw away 200 real places; taking only the second would throw away the
 * verified ones.
 */
export function optionsForCities(koreanCityNames: readonly string[]): JourneyOption[] {
  const seen = new Set<string>();
  return koreanCityNames.flatMap((name) => {
    const id = cityIdFromKorean(name);
    const direct = id ? (cityEntry(id)?.options ?? []) : [];
    return [...direct, ...optionsByAddress(name)].filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
  });
}

/** Cities the user picked that we have nothing for — shown, not hidden. */
export function citiesWithoutData(koreanCityNames: readonly string[]): string[] {
  return koreanCityNames.filter((name) => optionsForCities([name]).length === 0);
}

export const allOptions = CITIES.flatMap((c) => c.options);
export const supportedCities = CITIES.map(({ id, ko, en, coverage }) => ({ id, ko, en, coverage }));

/**
 * Where each place actually is.
 *
 * The ingest has always written a `<city>Coordinates` block next to the
 * options, and nothing read it — so every place fetched from TourAPI was
 * invisible on the map. The map only ever drew the two dozen coordinates
 * someone had typed by hand, and dropped the rest without saying so.
 *
 * This is the registry the map reads. A place missing from it is reported,
 * not silently skipped: a route that quietly omits three of its stops is
 * worse than one that says three stops have no coordinates yet.
 */
export type PlaceCoordinate = { lat: number; lng: number; city: CityId; ko: string; en: string; rm: string };

export const PLACE_COORDINATES: Record<string, PlaceCoordinate> =
  GENERATED_COORDINATES as Record<string, PlaceCoordinate>;

export const coordinateFor = (id: string): PlaceCoordinate | undefined => PLACE_COORDINATES[id];

/**
 * Korean names never travel alone.
 *
 * This app is for people who cannot read Hangul, so a city shown only as 서울
 * is unusable — and a city shown only as "Seoul" is useless the moment they
 * have to say it to a driver or type it into a Korean map app. Both, always,
 * in that order: the Hangul is what gets them there, the English is what lets
 * them recognise it.
 */
export const cityLabel = (korean: string): string => {
  const roman = CITY_ROMAN[korean];
  return roman ? `${korean} ${roman}` : korean;
};
