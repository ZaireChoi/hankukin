#!/usr/bin/env node
/**
 * Fill the `rm` (romanization) field on generated place files.
 *
 *   node scripts/romanize.mjs app/data/places/seoul.generated.ts
 *
 * Why this field exists at all: `rm` is what a traveler *says* out loud. The
 * Korean name is what they show a driver; the romanization is what they attempt
 * when they have to ask. TourAPI does not publish it, so we derive it.
 *
 * Two sources, in order of trust:
 *
 *   1. The official English name from TourAPI. "Gyeongbokgung Palace" already
 *      contains the romanization — strip the translated generic noun and you
 *      have it. This is the better source because KTO's English names follow
 *      the government's own conventions, including the irregular ones
 *      (서울 → Seoul, not Seoul-as-rules-would-have-it).
 *
 *   2. Rule-based Revised Romanization, as a fallback when the English name is
 *      a pure translation with no transliteration in it.
 *
 * Rule-based output is marked so a human can review it. Do not ship rule-based
 * romanization for a headline place without checking — official forms win.
 */

import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("  usage: node scripts/romanize.mjs app/data/places/<city>.generated.ts");
  process.exit(1);
}

/* ---------------------------------------------------------------- RR tables */
const INITIAL = ["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"];
const VOWEL = ["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","ui","i"];
const FINAL = ["","k","k","k","n","n","n","t","l","k","m","l","l","l","p","l","m","p","p","t","t","ng","t","t","k","t","p","t"];

/** Common assimilations across a syllable boundary (final + next initial). */
const ASSIMILATE = new Map(Object.entries({
  "k|n":"ngn", "k|m":"ngm", "k|r":"ngn",
  "n|r":"ll",  "l|n":"ll",
  "t|n":"nn",  "t|m":"nm",  "t|r":"nn",
  "p|n":"mn",  "p|m":"mm",  "p|r":"mn",
  "ng|r":"ngn",
  "l|r":"ll",
}));

function romanizeHangul(text) {
  const out = [];
  const syls = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) { syls.push({ raw: ch }); continue; }
    syls.push({
      i: INITIAL[Math.floor(code / 588)],
      v: VOWEL[Math.floor((code % 588) / 28)],
      f: FINAL[code % 28],
    });
  }
  syls.forEach((s, n) => {
    if (s.raw !== undefined) { out.push(s.raw === " " ? "-" : ""); return; }
    const next = syls[n + 1];
    let final = s.f;
    if (final && next && next.i !== undefined) {
      const key = `${final}|${next.i}`;
      if (ASSIMILATE.has(key)) {
        const merged = ASSIMILATE.get(key);
        out.push(s.i + s.v + merged);
        next.i = "";           // the merged consonant already covers it
        return;
      }
      // 연음: a final consonant moves to a following empty initial
      if (next.i === "") {
        const CARRY = { k:"g", t:"d", p:"b", l:"r" };
        next.i = CARRY[final] ?? final;
        final = "";
      }
    }
    out.push(s.i + s.v + final);
  });
  return out.join("");
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** English generic nouns that are translations, not transliterations. */
const GENERIC = new RegExp(
  "\\s*\\b(" +
  ["Palace","Temple","Grotto","Fortress","Tomb","Tombs","Complex","Museum","Market","Station",
   "Beach","Island","Village","Park","Bridge","Tower","Gate","Hall","Pond","Observatory",
   "Shrine","Cathedral","Church","Street","Alley","Valley","Mountain","Mount","River","Lake",
   "Cave","Falls","Waterfall","Trail","Road","Square","Center","Centre","Hot Springs","Spring",
   "Bookstore","Ceramics","Craft","Crafts","Shop","Store","Branch","Restaurant","Cafe","Café","Club","Gallery",
   "Cultural","Culture","National","Royal","Traditional","Area","District","Old","Town"].join("|") +
  ")\\b\\s*", "gi",
);

/** Function words that mean the English name is a translation, not a transliteration. */
const STOPWORD = /\b(of|and|the|in|at|for|to)\b/gi;

function fromEnglish(en, ko) {
  if (!en) return "";
  const stripped = en
    .replace(/\([^)]*\)/g, " ")
    .replace(GENERIC, " ")
    .replace(STOPWORD, " ")
    .replace(/\s*&\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!/^[A-Za-z][A-Za-z\-' ]*$/.test(stripped) || stripped.length < 2) return "";

  // The decisive check: does what survived actually sound like the Hangul?
  // "National Museum of Korea" strips down to "Korea", which has nothing to do
  // with 국립중앙박물관 — that is a translation and must fall through to rules.
  const rule = romanizeHangul(ko).toLowerCase().replace(/[^a-z]/g, "");
  const cand = stripped.toLowerCase().replace(/[^a-z]/g, "");
  if (!cand) return "";
  const head = cand.slice(0, 4);
  if (head.length >= 3 && !rule.includes(head)) return "";
  return stripped;
}

/* ------------------------------------------------------------------ rewrite */
let src = fs.readFileSync(file, "utf8");
let fromEn = 0, fromRule = 0, skipped = 0;

src = src.replace(
  /ko:"([^"]*)",en:"([^"]*)"([^}]*?)rm:""/g,
  (whole, ko, en, middle) => {
    let rm = fromEnglish(en, ko);
    let mark = "";
    if (!rm) {
      rm = cap(romanizeHangul(ko));
      if (!rm || /[^A-Za-z\- ]/.test(rm)) { skipped++; return whole; }
      mark = " /* rule-based — review */";
      fromRule++;
    } else {
      fromEn++;
    }
    return `ko:"${ko}",en:"${en}"${middle}rm:"${rm}"${mark}`;
  },
);

fs.writeFileSync(file, src);

console.log(`
  ${file}

  ${String(fromEn).padStart(4)}  from the official English name   (trusted)
  ${String(fromRule).padStart(4)}  rule-based Revised Romanization  (marked "review")
  ${String(skipped).padStart(4)}  skipped — neither source usable

  Rule-based entries are commented in place. Official forms override rules:
  a headline place should match how KTO writes it, not how the table does.
`);

/* Self-check when run with --test, so the tables stay honest. */
if (process.argv.includes("--test")) {
  const cases = [
    ["경복궁", "Gyeongbokgung"],
    ["불국사", "Bulguksa"],
    ["첨성대", "Cheomseongdae"],
    ["대릉원", "Daereungwon"],
    ["해운대", "Haeundae"],
    ["광안리", "Gwangalli"],
    ["종로",   "Jongno"],
  ];
  let bad = 0;
  for (const [ko, want] of cases) {
    const got = cap(romanizeHangul(ko));
    if (got !== want) { console.log(`  ✗ ${ko}: ${got} (expected ${want})`); bad++; }
  }
  console.log(bad ? `\n  ${bad} mismatch(es)\n` : "  ✓ romanization table matches all cases\n");
}
