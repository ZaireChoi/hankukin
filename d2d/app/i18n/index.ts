import type { TKey } from "./keys";
import { en } from "./en";
import { ko } from "./ko";
import { ja } from "./ja";
import { zhHans } from "./zh-Hans";
import { zhHant } from "./zh-Hant";

export type { TKey };

/**
 * Adding a language means adding one entry here and one dictionary file.
 * It must never mean editing JSX again.
 */
export type Lang = "en" | "ko" | "ja" | "zh-Hans" | "zh-Hant";

export const LANGS: { id: Lang; label: string; html: string }[] = [
  { id: "en", label: "EN", html: "en" },
  { id: "ko", label: "한국어", html: "ko" },
  { id: "ja", label: "日本語", html: "ja" },
  { id: "zh-Hans", label: "简体", html: "zh-Hans" },
  { id: "zh-Hant", label: "繁體", html: "zh-Hant" },
];

const DICT: Record<Lang, Partial<Record<TKey, string>>> = {
  en,
  ko,
  ja,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
};

/** Suffix used by localized data fields: titleKo / titleEn / titleJa ... */
const SUFFIX: Record<Lang, string> = {
  en: "En",
  ko: "Ko",
  ja: "Ja",
  "zh-Hans": "ZhHans",
  "zh-Hant": "ZhHant",
};

/** Bare-field suffix used by data shaped as { ko, en, ja, ... }. */
const BARE: Record<Lang, string> = {
  en: "en",
  ko: "ko",
  ja: "ja",
  "zh-Hans": "zhHans",
  "zh-Hant": "zhHant",
};

/** UI string lookup. Missing translations fall back to English, never to a blank. */
export function makeT(lang: Lang) {
  const table = DICT[lang] ?? en;
  return (key: TKey): string => table[key] ?? en[key] ?? key;
}

/** Same lookup with positional {0} {1} placeholders. */
export function makeTf(lang: Lang) {
  const t = makeT(lang);
  return (key: TKey, ...values: (string | number)[]): string =>
    t(key).replace(/\{(\d+)\}/g, (m, i) => String(values[Number(i)] ?? m));
}

type AnyRecord = Record<string, unknown>;

/** Localized data field with a prefix: locField(lang, plan, "title") -> plan.titleJa ?? plan.titleEn */
export function locField(lang: Lang, source: AnyRecord | undefined, base: string): string {
  if (!source) return "";
  return (
    (source[base + SUFFIX[lang]] as string) ??
    (source[base + "En"] as string) ??
    (source[base + "Ko"] as string) ??
    ""
  );
}

/** Localized data field with no prefix: loc(lang, option) -> option.ja ?? option.en */
export function loc(lang: Lang, source: AnyRecord | undefined): string {
  if (!source) return "";
  return (
    (source[BARE[lang]] as string) ??
    (source.en as string) ??
    (source.ko as string) ??
    ""
  );
}

/**
 * Hangul and romanization are deliberately NOT translated.
 * A traveler reading Japanese still has to show a Korean name to a driver,
 * and Korean map apps only search reliably in Hangul.
 */
export function hangul(source: AnyRecord | undefined): string {
  return (source?.ko as string) ?? "";
}
export function roman(source: AnyRecord | undefined): string {
  return (source?.rm as string) ?? "";
}
