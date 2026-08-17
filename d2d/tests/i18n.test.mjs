import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const APP = new URL("../app/", import.meta.url).pathname;
const read = (p) => fs.readFileSync(path.join(APP, p), "utf8");

const keysOf = (source) =>
  new Set([...source.matchAll(/^\s{2}"?([A-Za-z0-9_]+)"?:/gm)].map((m) => m[1]));

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

/**
 * Adding a language must never mean editing JSX again. These two tests are what
 * keep that promise: no hardcoded language branches in views, and every key the
 * views ask for exists in the English source of truth.
 */
test("no language ternaries survive in the views", () => {
  const offenders = [];
  for (const file of walk(APP)) {
    if (file.includes("/i18n/")) continue;
    const src = fs.readFileSync(file, "utf8");
    if (/\bko\s*\?\s*["'`]/.test(src)) offenders.push(path.relative(APP, file));
  }
  assert.deepEqual(offenders, [], `language ternaries found in:\n${offenders.join("\n")}`);
});

test("declared keys and English strings match exactly", () => {
  const declared = new Set([...read("i18n/keys.ts").matchAll(/\|\s*"([^"]+)"/g)].map((m) => m[1]));
  const english = keysOf(read("i18n/en.ts"));

  const missing = [...declared].filter((k) => !english.has(k));
  const extra = [...english].filter((k) => !declared.has(k));

  assert.deepEqual(missing, [], `declared but not translated in en.ts: ${missing.join(", ")}`);
  assert.deepEqual(extra, [], `in en.ts but not declared in keys.ts: ${extra.join(", ")}`);
});

test("every other language is a subset of the English keys", () => {
  const english = keysOf(read("i18n/en.ts"));
  for (const file of ["i18n/ko.ts", "i18n/ja.ts", "i18n/zh-Hans.ts", "i18n/zh-Hant.ts"]) {
    const stray = [...keysOf(read(file))].filter((k) => !english.has(k));
    assert.deepEqual(stray, [], `${file} has keys English does not: ${stray.join(", ")}`);
  }
});

test("Hangul and romanization are excluded from translation", () => {
  const i18n = read("i18n/index.ts");
  assert.match(i18n, /export function hangul/, "hangul() must stay outside the dictionary");
  assert.match(i18n, /export function roman/, "roman() must stay outside the dictionary");
});
