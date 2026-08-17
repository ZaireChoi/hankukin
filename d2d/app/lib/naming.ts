import type { Lang } from "../i18n";
import type { JourneyOption } from "./types";
import { CITY_ROMAN } from "../data/places";

/**
 * Which name leads, and which one rides underneath.
 *
 * The rule sounds obvious once it is written down and was still wrong on
 * screen for a day: THE LANGUAGE YOU ARE READING IN LEADS. An English-speaking
 * traveler opened the English build and saw
 *
 *     아늑에어 호텔 개봉점          ← large, bold
 *     Aank Air Hotel Gaebong       ← small, grey
 *
 * which is the language switch quietly not applying to the one thing on the
 * row that matters. The Korean was doing the job of the headline and the
 * English was doing the job of a footnote, for someone who cannot read the
 * headline.
 *
 * ── But the Korean never disappears ─────────────────────────────────────
 *
 * The two names are not a translation pair, they are two different tools:
 *
 *   THE LEAD is what the traveler reads and remembers. It follows the
 *   interface language.
 *
 *   THE COMPANION is what they point at. A taxi driver, a ticket window, a
 *   station sign — none of those read English, so 아차산 has to stay on the
 *   row, at any interface language, forever. It just belongs in the smaller
 *   line, because it is for showing, not for reading.
 *
 * In Korean the pair inverts: 한글 leads and the romanization rides under,
 * since that is the one a Korean speaker would read aloud to a foreign
 * companion. Same rule, mirrored — never "English is always secondary".
 */

/** The name in the reader's own language, falling back the way our data does. */
export function leadName(lang: Lang, o: Pick<JourneyOption, "ko" | "en" | "ja" | "zhHans" | "zhHant">): string {
  if (lang === "ko") return o.ko;
  if (lang === "ja") return o.ja || o.en || o.ko;
  if (lang === "zh-Hans") return o.zhHans || o.en || o.ko;
  if (lang === "zh-Hant") return o.zhHant || o.zhHans || o.en || o.ko;
  return o.en || o.ko;
}

/**
 * The line underneath: the Korean, plus how to say it.
 *
 * Reading in Korean already, so the useful companion is the romanization —
 * what to write on a form, or say to someone who does not read Hangul.
 */
export function companionName(
  lang: Lang,
  o: Pick<JourneyOption, "ko" | "en" | "rm">,
): string {
  if (lang === "ko") return [o.rm, o.en].filter(Boolean).join(" · ");
  return [o.ko, o.rm].filter(Boolean).join(" · ");
}

/** Both at once, for the components that render a two-line name. */
export const namePair = (lang: Lang, o: JourneyOption) => ({
  lead: leadName(lang, o),
  companion: companionName(lang, o),
});

/**
 * A city, same rule.
 *
 * `cityLabel` glues them into one string — "서울 Seoul" — which is right for a
 * chip or a heading where there is only one line to work with. It now puts the
 * reader's language first for the same reason the rows do.
 */
export function cityName(lang: Lang, korean: string): { lead: string; companion: string } {
  const roman = CITY_ROMAN[korean];
  if (!roman) return { lead: korean, companion: "" };
  return lang === "ko" ? { lead: korean, companion: roman } : { lead: roman, companion: korean };
}

export function cityLabelFor(lang: Lang, korean: string): string {
  const { lead, companion } = cityName(lang, korean);
  return companion ? `${lead} ${companion}` : lead;
}
