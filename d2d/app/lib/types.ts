// Shared domain types. Kept separate so data modules and view components
// can import them without pulling in the page.

export type Ride = "transit" | "taxi" | "drive";
export type Tab = "live" | "plan" | "build" | "saved";
export type PlannerStage = "input" | "results" | "detail";
export type MapScale = "korea" | "city" | "street";
/**
 * Map zoom intent, not a place. `city` means "the city of the stops on screen",
 * whichever that turns out to be — the previous value was literally "gyeongju",
 * so a Busan route had no way to zoom in.
 */
export type BuildMapScope = "city" | "korea";
export type Stop = { id: number; ko: string; en: string; kind: string; locked: boolean; minutes?: number; cost?: number; optionId?: string; metaKo?: string; metaEn?: string };
export type JourneyCategory = "all" | "heritage" | "family" | "experience" | "food" | "shopping" | "comfort" | "rest";
/** Which Korean city this option belongs to. Options are never global. */
export type CityId = string;

export type JourneyOption = {
  city: CityId;
  id: string; category: Exclude<JourneyCategory,"all">; ko: string; en: string;
  /** Names in the other interface languages. Supplied by TourAPI per language. */
  ja?: string; zhHans?: string; zhHant?: string;
  /** Romanization — what the traveler *says*. Never translated, never dropped. */
  rm?: string;
  zoneKo: string; zoneEn: string;
  stayMinutes: number; transferMinutes: number; cost: number; costKo: string; costEn: string;
  hoursKo: string; hoursEn: string; sourceKo: string; sourceEn: string; kind: string;
  walk: "low" | "medium" | "high"; booking?: boolean; night?: boolean; condition?: "hot" | "cold" | "rain" | "tired";
};

