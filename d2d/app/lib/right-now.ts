import type { JourneyOption } from "./types";
import type { Theme } from "../components/TripSetup";
import { optionsForCities } from "../data/places";
import { openAt } from "./hours";
import type { OpenState } from "./hours";

/**
 * "We're at the hotel, it's too early to sleep — where can we go?"
 *
 * This is the same question the planner already answers, asked from inside the
 * trip instead of from before it. That is the whole design claim of this
 * module, and it is worth stating plainly because it is what keeps the app
 * from splitting into two products:
 *
 *   PLANNING is: here is a gap between landing and check-in, what fits.
 *   IMPROVISING is: here is a gap between now and bedtime, what fits.
 *
 * Same subtraction, same pool, same themes. So an itinerary is not a contract
 * the traveler is failing to keep when the afternoon goes sideways — it is
 * just the version of this answer computed earlier, when the only thing known
 * about 8pm was that it existed.
 *
 * What that buys: a plan you can walk away from without losing it. Accepting a
 * suggestion here does not discard the itinerary, it inserts a node into it —
 * so the trip stays one chain, and the next morning still starts where tonight
 * actually ended rather than where it was supposed to.
 *
 * ── On claiming a place is open ─────────────────────────────────────────
 *
 * 1,567 of our places say "Hours need checking". Ten say "09:00-18:00".
 * An app that sorted by "Open now" would be sorting mostly on an assumption,
 * and the traveler would find out which at the door.
 *
 * So `openNow` is a THREE-state answer — true, false, or null — and null is
 * the common one. Null is not a failure to compute; it is the honest result of
 * a source that never published the hours. It is shown as its own state, never
 * quietly folded in with "open" to make the list look longer.
 */


// Re-exported so a screen importing "what fits now" also gets the honesty
// rule that decides whether a row may say "open".
export { openAt };
export type { OpenState };

/** What the traveler is in the mood for, which is not the same as the trip's theme. */
export type Mood = "walk" | "eat" | "coffee" | "shop" | "night" | "rest";

export const MOODS: { id: Mood; categories: JourneyOption["category"][] }[] = [
  { id: "walk", categories: ["heritage", "experience"] },
  { id: "eat", categories: ["food"] },
  { id: "coffee", categories: ["food", "rest"] },
  { id: "shop", categories: ["shopping"] },
  { id: "night", categories: ["experience", "shopping", "food"] },
  { id: "rest", categories: ["rest", "comfort"] },
];

export type Suggestion = {
  option: JourneyOption;
  /** Stay + transfer, in minutes. What it will actually cost you. */
  minutes: number;
  openNow: OpenState;
  /** True when it would still be open by the time you got there. */
  fits: boolean;
};

/**
 * What fits between now and the next thing you have to be at.
 *
 * `until` is the wall the answer has to respect: tomorrow's train, the last
 * subway, or just when the traveler wants to be back. Nothing is suggested
 * that does not get them back before it.
 */
export function whatFitsNow(opts: {
  city: string;
  /** Minutes from midnight. */
  now: number;
  /** Minutes from midnight the traveler needs to be back by. */
  until: number;
  mood: Mood | null;
  themes: Theme[];
  /** Places already on today's plan — never offered twice. */
  exclude?: Set<string>;
  limit?: number;
  /** 0 = Sunday. Without it, weekly closures cannot be honoured. */
  weekday?: number;
}): Suggestion[] {
  const { city, now, until, mood, themes, exclude, limit = 8, weekday } = opts;
  const free = until - now;
  if (free < 40) return [];

  const wanted = new Set<string>(mood ? MOODS.find((m) => m.id === mood)?.categories ?? [] : []);
  const themed = new Set<string>(themes as string[]);

  return optionsForCities([city])
    .filter((o) => !exclude?.has(o.id))
    // "Hotel rest & free time" is a slot in a day plan, not somewhere to go.
    // Offering it to someone who is asking what to do tonight — from the
    // hotel — is the app answering "stay where you are".
    .filter((o) => o.zoneKo !== "숙소")
    .filter((o) => (wanted.size ? wanted.has(o.category) : true))
    .map((o): Suggestion => {
      const minutes = o.stayMinutes + o.transferMinutes;
      const arrive = now + o.transferMinutes;
      const state = openAt(o.hoursEn, arrive, weekday);
      return {
        option: o,
        minutes,
        openNow: state,
        // Unknown hours do not disqualify a place — they qualify the answer.
        fits: minutes <= free && state !== false,
      };
    })
    .filter((s) => s.fits)
    .sort((a, b) => {
      // Known-open first, then what the traveler came to Korea for, then the
      // rows we can actually tell them something about.
      const open = Number(b.openNow === true) - Number(a.openNow === true);
      if (open) return open;
      const th = Number(themed.has(b.option.category)) - Number(themed.has(a.option.category));
      if (th) return th;
      const told = tellsYouMore(b.option) - tellsYouMore(a.option);
      if (told) return told;
      return a.minutes - b.minutes;
    })
    .reduce(spreadOut, [])
    .slice(0, limit);
}

/**
 * How much this row can actually tell the traveler.
 *
 * Every place in the catalogue carries the same 60-minute stay and the same
 * 15-minute transfer, so the sort above ties nearly everywhere and the tie
 * used to break alphabetically — which is why the list opened with Africa
 * Museum, Alleys of Changsin-dong, Apgujeong, Appenzeller, April 19th. Six
 * entries starting with A is not a ranking; it is the alphabet showing
 * through, and it looks exactly like a broken sort because it is one.
 *
 * We have no distances and will not invent them. The one real difference left
 * between two otherwise identical rows is how much of them is filled in: a
 * place with published hours and a published fee is a more useful suggestion
 * at 20:00 than one where both say "needs checking". So that is what breaks
 * the tie. It ranks our own knowledge, and claims nothing about the place.
 */
const VAGUE = /need|varies|check|n\/a/i;
const tellsYouMore = (o: JourneyOption): number =>
  (o.hoursEn && !VAGUE.test(o.hoursEn) ? 1 : 0) + (o.costEn && !VAGUE.test(o.costEn) ? 1 : 0);

/**
 * Stop the list from being six museums in the same district.
 *
 * Every place in the catalogue carries the same 60-minute stay and the same
 * 15-minute transfer, because that is what we actually know — so the sort
 * above ties almost everywhere and the tie breaks alphabetically. Six entries
 * starting with A is not a ranking, it is the alphabet showing through.
 *
 * We have no distances and will not invent them, so this does the one honest
 * thing left: it takes the sorted list and pushes each repeat of a category
 * further down the page, so a traveler sees a market, a palace and a viewpoint
 * before the fourth museum. It reorders; it never adds, drops, or claims one
 * place is nearer than another.
 */
function spreadOut(acc: Suggestion[], s: Suggestion): Suggestion[] {
  const seen = acc.filter((x) => x.option.category === s.option.category).length;
  if (seen === 0) return [...acc, s];
  const at = Math.min(acc.length, (seen + 1) * 3);
  return [...acc.slice(0, at), s, ...acc.slice(at)];
}

/** Minutes from midnight, from the device clock. The only place we read it. */
export const minutesNow = (d: Date): number => d.getHours() * 60 + d.getMinutes();
