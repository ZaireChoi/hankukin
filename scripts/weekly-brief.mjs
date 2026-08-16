#!/usr/bin/env node
/**
 * 주간 운영자 브리핑 — 한 화면에 들어가는 것만 적는다.
 *
 * 운영자는 주 1회 30~60분이다. 그 시간에 읽을 수 없는 보고서는 보고서가 아니다.
 * 그래서 이 파일은 **판단이 필요한 것만** 남기고 나머지는 숫자 한 줄로 줄인다.
 *
 * 사람이 답할 것 (선택지는 셋뿐이다)
 *   Continue    그대로 둔다
 *   Prioritize  다음 주에 이것부터
 *   Pause       멈춘다
 *
 * 실행:  node scripts/weekly-brief.mjs > brief.md
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const CONTENT = join(ROOT, 'src/content');
const STALE_DAYS = 90;

/** 축 목표 — 지시문 ① 의 비율. 코드가 세면 기억이 흐들려도 흐들리지 않는다. */
const TARGET = { scenes: 0.30, hangul: 0.20, decode: 0.20, now: 0.20, guides: 0.10 };

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.mdx?$/.test(name)) out.push(p);
  }
  return out;
}

function frontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}
const field = (fm, key) => (fm.match(new RegExp(`^${key}:\\s*["']?(.*?)["']?\\s*$`, 'm')) || [])[1] || null;

/* ── 모으기 ─────────────────────────────────────────────────── */

const axes = Object.keys(TARGET);
const articles = [];
for (const axis of axes) {
  for (const path of walk(join(CONTENT, axis))) {
    const raw = readFileSync(path, 'utf8');
    const fm = frontmatter(raw);
    const words = raw.replace(/^---[\s\S]*?---/, '').split(/\s+/).filter(Boolean).length;
    articles.push({
      axis,
      file: relative(ROOT, path).replace(/\\/g, '/'),
      title: field(fm, 'title'),
      checkedAt: field(fm, 'checkedAt'),
      publishedAt: field(fm, 'publishedAt'),
      riskGrade: field(fm, 'riskGrade'),
      affiliates: (fm.match(/^\s+-\s+label:/gm) || []).length,
      words,
    });
  }
}

const total = articles.length;
const count = Object.fromEntries(axes.map((a) => [a, articles.filter((x) => x.axis === a).length]));

/** 목표 대비 가장 미달인 축 — 다음 글의 주제는 여기서 고른다 */
const gap = axes
  .map((a) => ({ axis: a, have: count[a], want: Math.round(TARGET[a] * total), short: TARGET[a] * total - count[a] }))
  .sort((x, y) => y.short - x.short);

const stale = articles
  .filter((a) => a.checkedAt && Math.floor((today - new Date(a.checkedAt)) / 86400000) > STALE_DAYS)
  .map((a) => ({ ...a, age: Math.floor((today - new Date(a.checkedAt)) / 86400000) }))
  .sort((x, y) => y.age - x.age);

const soon = articles
  .filter((a) => {
    if (!a.checkedAt) return false;
    const age = Math.floor((today - new Date(a.checkedAt)) / 86400000);
    return age > STALE_DAYS - 14 && age <= STALE_DAYS;
  })
  .sort((x, y) => new Date(x.checkedAt) - new Date(y.checkedAt));

const week = new Date(today - 7 * 86400000);
const published = articles.filter((a) => a.publishedAt && new Date(a.publishedAt) >= week);
const withAffiliate = articles.filter((a) => a.affiliates > 0);

/* 링크 점검 결과가 있으면 함께 읽는다 — 없으면 없다고 적는다. 지어내지 않는다. */
let link = null;
const LINK_RESULT = join(ROOT, 'data/link-check.result.json');
if (existsSync(LINK_RESULT)) link = JSON.parse(readFileSync(LINK_RESULT, 'utf8'));

/* ── 쓰기 ───────────────────────────────────────────────────── */

const out = [];
const p = (s = '') => out.push(s);

p(`# 주간 브리핑 — ${iso(today)}`);
p();
p(`기사 **${total}편** · 이번 주 발행 **${published.length}편** · 제��� 링크가 붙은 글 **${withAffiliate.length}편**`);
p();

p('## 1. 다음 글은 어느 축에서');
p();
p('| 축 | 현재 | 목표 | 부족 |');
p('|---|---:|---:|---:|');
for (const g of gap) {
  const mark = g.short > 0 ? `**${g.short.toFixed(1)}**` : '—';
  p(`| ${g.axis} | ${g.have} | ${g.want} | ${mark} |`);
}
p();
p(`→ 가장 미달인 축은 **${gap[0].axis}** 이다. 특별한 이유가 없으면 여기서 고른다.`);
p();

p('## 2. 재확인이 필요한 글');
p();
if (stale.length === 0 && soon.length === 0) {
  p('없다. 90일이 지난 글도, 2주 안에 지날 글도 없다.');
} else {
  if (stale.length) {
    p(`**${STALE_DAYS}일이 지났다 — 새 글보다 먼저 한다 (${stale.length}편)**`);
    p();
    for (const a of stale.slice(0, 10)) p(`- \`${a.file}\` — ${a.age}일 · ${a.title || ''}`);
    if (stale.length > 10) p(`- … 외 ${stale.length - 10}편`);
    p();
  }
  if (soon.length) {
    p(`2주 안에 90일이 되는 글 ${soon.length}편: ${soon.slice(0, 5).map((a) => `\`${a.file.split('/').pop()}\``).join(' · ')}`);
    p();
  }
}

p('## 3. 링크');
p();
if (!link) {
  p('점검 결과 파일이 없다. `node scripts/link-check.mjs` 가 아직 한 번도 돌지 않았다.');
} else {
  p(`${link.ranAt} · ${link.mode} · 주소 ${link.urls}개`);
  p();
  if (link.fails.length) {
    p(`**실패 ${link.fails.length}건 — 발행을 막고 있다**`);
    p();
    for (const f of link.fails.slice(0, 10)) p(`- \`${f.rule}\` ${f.file} — ${f.msg}`);
    p();
  } else {
    p('실패 0건.');
    p();
  }
  const notable = link.warns.filter((w) => w.rule !== 'stale');
  if (notable.length) {
    p(`경고 ${notable.length}건 (사람이 한 번 열어 볼 것)`);
    p();
    for (const w of notable.slice(0, 8)) p(`- \`${w.rule}\` ${w.file} — ${w.msg}`);
    p();
  }
}

p('## 4. 이번 주 발행');
p();
if (published.length === 0) {
  p('없다. 이유가 「1차 출처를 못 열었다」 라면 정상이다. 「주제은행이 비었다」 라면 다음 주 작업은 주제은행이다.');
} else {
  for (const a of published) p(`- [${a.axis}] ${a.title} — ${a.words}단어 · ${a.riskGrade}`);
}
p();

p('## 5. 운영자 선택');
p();
p('- `Continue` — 그대로 둔다');
p(`- \`Prioritize\` — 다음 주는 **${stale.length ? '재확인' : gap[0].axis}** 부터`);
p('- `Pause` — 발행을 멈춘다');
p();
p('---');
p();
p('_이 브리핑은 저장소의 파일만 읽어서 만든다. 트래픽·수익 숫자는 여기에 없다 —');
p('_Search Console 과 AdSense 를 붙이기 전까지 지어내지 않는다._');

console.log(out.join('\n'));
