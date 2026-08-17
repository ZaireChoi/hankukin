/**
 * Reading Korean opening hours, honestly.
 *
 * Split out from the screens that use it for one reason: it is the only piece
 * of this app that can be tested against the actual strings in the catalogue,
 * and a pure module with no data imports is a module a test can just call.
 *
 * The catalogue's hours are free text from KTO TourAPI. Some of it is
 * "09:00-18:00". Most of it is "Hours need checking". A useful amount is
 * "11:00-19:00 / * Last admission 30 min before closing. · Closed: Mondays",
 * which is a range, a caveat and a weekly closure in one string.
 *
 * The rule this file exists to enforce: WHEN THE TEXT STOPS BEING CLEAR, THE
 * ANSWER IS `null`. Not the range, not a best guess. A wrong "closed" sends a
 * traveler home early; a wrong "open" sends them across a city to a locked
 * gate. `null` does neither, and says so on the row.
 */

export type OpenState = true | false | null;

/** Places that never close, in the vocabulary our own data actually uses. */
const ALWAYS_OPEN = /open\s*24|00:00\s*[-~]\s*24:00|24\/7/i;
const UNKNOWABLE = /need|varies|n\/a|check/i;
const RANGE = /(\d{1,2}):(\d{2})\s*[-~–]\s*(\d{1,2}):(\d{2})/;
/** Index matches Date#getDay: 0 = Sunday. */
const DAY_WORDS = [/sun/i, /mon/i, /tue/i, /wed/i, /thu/i, /fri/i, /sat/i];
/**
 * A weekday name qualified into something that is not weekly.
 *
 * "Closed: Mondays" is every Monday. "Closed: the first Wednesday of each
 * month" contains the word Wednesday and means almost the opposite — eleven
 * Wednesdays in twelve, the place is open. Matching on the day name alone
 * would turn the rarer statement into the common one.
 */
const NOT_WEEKLY = /\bfirst\b|\bsecond\b|\bthird\b|\bfourth\b|\blast\b|month|\d(?:st|nd|rd|th)/i;

/**
 * Is it open at `minute` (minutes from midnight)?
 *
 * Returns null the moment the text stops being a clean range — "Varies by
 * store", "Hours need checking", anything with a season or a weekday caveat we
 * are not parsing. A wrong `false` sends someone home early; a wrong `true`
 * sends them across a city to a locked gate. Null does neither.
 */
export function openAt(hoursEn: string, minute: number, weekday?: number): OpenState {
  const text = (hoursEn || "").trim();
  if (!text) return null;

  /**
   * The closing day comes first, because it outranks the clock.
   *
   * "11:00-19:00 · Closed: Mondays" is open at 14:00 six days a week and shut
   * at 14:00 on the seventh. Reading only the range would have told a traveler
   * on a Monday that the museum was open — the most confident possible way to
   * be wrong. When we cannot tell which day is meant, the answer is null, not
   * the range.
   */
  const closed = /closed\s*:\s*([^·|]+)/i.exec(text);
  if (closed && weekday !== undefined) {
    const clause = closed[1].toLowerCase();
    const isOpenAllYear = /all year|n\/a|none|no closed/.test(clause);
    if (!isOpenAllYear) {
      if (NOT_WEEKLY.test(clause)) return null;
      const hit = DAY_WORDS.findIndex((w) => w.test(clause));
      if (hit >= 0) { if (hit === weekday) return false; }
      else return null; // a closure clause we did not understand
    }
  }

  if (ALWAYS_OPEN.test(text)) return true;
  const m = RANGE.exec(text);
  if (!m) return null;
  /**
   * A caveat sitting beside the range means the range is not the whole story —
   * but the closure clause is not a caveat, it was already decided above. Left
   * in, its "N/A (Open all year round)" trips the unknowable test and turns a
   * perfectly clear 09:00-18:00 into a shrug.
   */
  const rest = text.replace(m[0], "").replace(closed?.[0] ?? "", "");
  if (UNKNOWABLE.test(rest)) return null;
  const from = Number(m[1]) * 60 + Number(m[2]);
  const to = Number(m[3]) * 60 + Number(m[4]);
  if (to <= from) return null; // crosses midnight — not parsing that here
  // Arriving fifteen minutes before closing is not "open".
  return minute >= from && minute <= to - 15;
}

