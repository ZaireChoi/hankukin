// Translation coverage. Run: node scripts/i18n-status.mjs
// Missing keys are not a bug — they fall back to English — but this is how you
// see what is left before announcing a language.
import { en } from "../app/i18n/en.ts";
import { ko } from "../app/i18n/ko.ts";
import { ja } from "../app/i18n/ja.ts";
import { zhHans } from "../app/i18n/zh-Hans.ts";
import { zhHant } from "../app/i18n/zh-Hant.ts";

const total = Object.keys(en).length;
const rows = [
  ["en (source)", en],
  ["ko", ko],
  ["ja", ja],
  ["zh-Hans", zhHans],
  ["zh-Hant", zhHant],
];

console.log(`\n  ${total} UI keys\n`);
for (const [name, dict] of rows) {
  const done = Object.keys(en).filter((k) => dict[k]).length;
  const pct = Math.round((done / total) * 100);
  const bar = "█".repeat(Math.round(pct / 4)).padEnd(25, "·");
  console.log(`  ${name.padEnd(12)} ${bar} ${String(pct).padStart(3)}%  ${done}/${total}`);
}
console.log("\n  Untranslated keys fall back to English at runtime.\n");
