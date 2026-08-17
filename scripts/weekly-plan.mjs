#!/usr/bin/env node
/**
 * 주간 작업지시서 — 월요일 아침에 이것 하나만 연다.
 *
 * weekly-brief 를 대체한다. 브리핑은 「무슨 일이 있었나」를 적었고
 * 이것은 「이번 주에 무엇을 할 것인가」를 적는다. 운영자가 주 1회 30~60분이면
 * 필요한 것은 회고가 아니라 **목록**이다.
 *
 * 세 가지를 한 화면에 놓는다.
 *   ① 축 균형        다음 원문은 어느 축에서 고르나
 *   ② 번역 큐        ja · zh-hans 를 무엇부터, 그리고 낡은 번역은 무엇인가
 *   ③ Now/Decode 후보 신호에서 올라온 것 — 게이트를 못 넘은 것은 이유와 함께
 *
 * 이 파일은 **저장소의 파일과 수집 결과만 읽는다.** 없는 것은 없다고 적는다.
 * 후보가 비면 비었다고 적지, 그럴듯한 주제를 지어내지 않는다.
 * 지어낸 후보 하나가 안 쓴 열 편보다 나쁘다는 것이 이 사이트의 규칙이다.
 *
 * 실행:  node scripts/weekly-plan.mjs > plan.md
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const CONTENT = join(ROOT, 'src/content');
const STALE_DAYS = 90;

/* brand.mjs 는 순수 ESM 이라 그대로 읽을 수 있다.
 * 언어 목록과 언어별 계획을 여기서 다시 적지 않는다 — 두 곳에 적으면 반드시 어긋난다. */
const brand = await import(pathToFileURL(join(ROOT, 'src/config/brand.mjs')).href);
const { LOCALES, DEFAULT_LOCALE, LOCALE_LABELS, LOCALE_CONTENT_PLAN, CATEGORIES } = brand;

const AXES = CATEGORIES.map((c) => c.path);
/** 축 목표 비율 — 지시문 ①. 여기 없는 축은 목표 0 으로 본다. */
const TARGET = { scenes: 0.30, hangul: 0.20, decode: 0.20, now: 0.20, guides: 0.10 };

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const days = (a, b) => Math.floor((a - b) / 86400000);

/* ── 읽기 ──────────────────────────────────────────────────────── */

const fmOf = (raw) => (raw.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [, ''])[1];
const field = (fm, key) =>
  (fm.match(new RegExp(`^${key}:\\s*["']?(.*?)["']?\\s*$`, 'm')) || [])[1] || null;
const nested = (fm, key) =>
  (fm.match(new RegExp(`^\\s+${key}:\\s*["']?(.*?)["']?\\s*$`, 'm')) || [])[1] || null;

/** 원문과 번역본을 나눠 담는다. 축 개수에 번역본을 넣으면 축 균형이 거짓이 된다. */
const originals = new Map();   // 'now/slug' -> {…}
const translated = [];         // {of, locale, …}

for (const axis of AXES) {
  const dir = join(CONTENT, axis);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      // <축>/<언어>/<슬러그>.mdx — 번역본
      if (!LOCALES.includes(name) || name === DEFAULT_LOCALE) continue;
      for (const f of readdirSync(p).filter((x) => /\.mdx?$/.test(x))) {
        const raw = readFileSync(join(p, f), 'utf8');
        const fm = fmOf(raw);
        translated.push({
          locale: name,
          file: relative(ROOT, join(p, f)).replace(/\\/g, '/'),
          of: nested(fm, 'of'),
          sourceCheckedAt: nested(fm, 'sourceCheckedAt'),
          status: nested(fm, 'status'),
          title: field(fm, 'title'),
        });
      }
      continue;
    }
    if (!/\.mdx?$/.test(name)) continue;
    const raw = readFileSync(p, 'utf8');
    const fm = fmOf(raw);
    const id = `${axis}/${name.replace(/\.mdx?$/, '')}`;
    originals.set(id, {
      id, axis,
      file: relative(ROOT, p).replace(/\\/g, '/'),
      title: field(fm, 'title'),
      checkedAt: field(fm, 'checkedAt'),
      publishedAt: field(fm, 'publishedAt'),
      words: raw.replace(/^---[\s\S]*?---/, '').split(/\s+/).filter(Boolean).length,
    });
  }
}

const arts = [...originals.values()];
const total = arts.length;

/* ── ① 축 균형 ────────────────────────────────────────────────── */

const gap = AXES.map((a) => {
  const have = arts.filter((x) => x.axis === a).length;
  const want = (TARGET[a] ?? 0) * total;
  return { axis: a, have, want: Math.round(want), short: want - have };
}).sort((x, y) => y.short - x.short);

/* ── ② 번역 큐 ─────────────────────────────────────────────────── */

const byLocale = {};
for (const locale of LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
  const mine = translated.filter((t) => t.locale === locale);
  const done = new Set(mine.map((t) => t.of));
  const plan = LOCALE_CONTENT_PLAN?.[locale] ?? {};
  const drop = plan.deprioritise ?? {};

  /* 낡은 번역 — 원문이 그 뒤에 다시 확인됐다.
   * 이건 대기열이 아니라 부채다. 게이트 열 번째가 빌드를 세우므로 새 번역보다 먼저다. */
  const stale = mine
    .map((t) => {
      const src = originals.get(t.of);
      if (!src || !src.checkedAt || !t.sourceCheckedAt) return null;
      if (new Date(src.checkedAt) <= new Date(t.sourceCheckedAt)) return null;
      return { ...t, srcCheckedAt: src.checkedAt, behind: days(new Date(src.checkedAt), new Date(t.sourceCheckedAt)) };
    })
    .filter(Boolean)
    .sort((a, b) => b.behind - a.behind);

  /* 다음에 번역할 것 — 언어별 계획의 순서를 그대로 쓴다.
   * "성과 상위부터" 는 Search Console 이 붙기 전에는 측정할 수 없다.
   * 측정 못하는 기준으로 정렬하는 척하지 않고, 사람이 정한 순서를 쓴다. */
  const next = (plan.priority ?? [])
    .filter((id) => !done.has(id))
    .map((id) => ({ id, exists: originals.has(id), title: originals.get(id)?.title ?? null }));

  const untouched = [...originals.keys()]
    .filter((id) => !done.has(id) && !(plan.priority ?? []).includes(id) && !drop[id]);

  byLocale[locale] = { mine, stale, next, untouched, drop, why: plan.why ?? null };
}

/* ── ③ Now/Decode 후보 ─────────────────────────────────────────── */

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const signals = readJson(join(ROOT, 'data/signals/latest.json'));
const radar = readJson(join(ROOT, 'data/briefs/latest-summary.json'));
const tally = readJson(join(ROOT, 'data/comment-tally.json'));

/* ── 90일 재확인 ────────────────────────────────────────────────── */

const stale90 = arts
  .filter((a) => a.checkedAt && days(today, new Date(a.checkedAt)) > STALE_DAYS)
  .map((a) => ({ ...a, age: days(today, new Date(a.checkedAt)) }))
  .sort((x, y) => y.age - x.age);

/* ── 쓰기 ──────────────────────────────────────────────────────── */

const out = [];
const p = (s = '') => out.push(s);

p(`# 이번 주 (${iso(today)})`);
p();
p(`원문 **${total}편** · 번역 **${translated.length}편** (${LOCALES.filter((l) => l !== DEFAULT_LOCALE)
  .map((l) => `${LOCALE_LABELS[l] ?? l} ${translated.filter((t) => t.locale === l).length}`)
  .join(' · ')})`);
p();

/* ①  */
p('## ① 다음 원문은 어느 축에서');
p();
p('| 축 | 현재 | 목표 | 부족 |');
p('|---|---:|---:|---:|');
for (const g of gap) p(`| ${g.axis} | ${g.have} | ${g.want} | ${g.short > 0 ? `**${g.short.toFixed(1)}**` : '—'} |`);
p();
p(`→ 최미달 **${gap[0].axis}**. 동률이면 scenes → hangul → decode 순.`);
p();

/* ②  */
p('## ② 번역 큐');
p();
p('> 번역은 문장을 옮기는 일이지만 다뵽어는 독자를 바꾸는 일이다.');
p('> 언어별 목록이 다른 이유가 그것이고, 그 판단은 `src/config/brand.mjs` 의 계획표에 있다.');
p();

let debt = 0;
for (const locale of LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
  const L = byLocale[locale];
  debt += L.stale.length;
  p(`### ${LOCALE_LABELS[locale] ?? locale} (\`${locale}\`) — 발행 ${L.mine.length}편`);
  p();
  if (L.why) p(`_${L.why}_`);
  p();

  if (L.stale.length) {
    p(`**낡은 번역 ${L.stale.length}편 — 새 번역보다 먼저. 게이트가 빌드를 세운다.**`);
    p();
    for (const s of L.stale) {
      p(`- \`${s.file}\``);
      p(`  원문이 ${s.srcCheckedAt} 에 다시 확인됐는데 이 번역은 ${s.sourceCheckedAt} 기준이다 (${s.behind}일 뒤짐)`);
    }
    p();
  } else {
    p('낡은 번역 없음.');
    p();
  }

  if (L.next.length) {
    p(`다음 번역 후보 (계획표 순서, ${L.next.length}편 남음)`);
    p();
    for (const n of L.next.slice(0, 5)) {
      p(n.exists
        ? `- [ ] \`${n.id}\` — ${n.title ?? ''}`
        : `- [ ] \`${n.id}\` — ⚠ 원문이 없다. 계획표의 id 가 틀렸거나 원문이 아직 안 쓰였다`);
    }
    p();
  } else {
    p('계획표의 우선 목록은 모두 번역됐다. 다음 순서는 유입을 보고 정한다 — 지금 정하면 추측이다.');
    p();
  }

  const dropped = Object.entries(L.drop);
  if (dropped.length) {
    p('번역하지 않기로 한 것');
    p();
    for (const [id, why] of dropped) p(`- \`${id}\` — ${why.replace(/\s+/g, ' ').trim()}`);
    p();
  }
  p(`계획표에 없는 미번역 원문 ${L.untouched.length}편은 목록에 넣지 않았다. 순서가 정해지지 않은 것을 목록에 올리면 아무거나 번역하게 된다.`);
  p();
}

/* ③  */
p('## ③ Now / Decode 후보');
p();
if (!signals && !radar) {
  p('**신호 파일이 하나도 없다.**');
  p();
  p('- `data/signals/latest.json` 없음 — `collect-trends` 워크플로가 돌지 않았거나 실패했다');
  p('- `data/briefs/latest-summary.json` 없음 — `collect-releases` 도 마찬가지');
  p();
  p('후보를 지어내지 않는다. 이번 주 작업은 **수집 워크플로를 고치는 것**이다.');
  p();
} else {
  if (signals) {
    /* collect-trends 는 topics 를 **객체**로 쓴다 (id 를 키로). 배열로 가정하면 조용히 0건이 된다.
     * 독립 신호는 서로 다른 source 의 개수다 — 같은 출처에서 두 번 본 것은 하나로 센다. */
    const topics = Array.isArray(signals.topics) ? signals.topics : Object.values(signals.topics ?? {});
    const indep = (t) => t.independentSources ?? new Set((t.signals ?? []).map((s) => s.source)).size;
    const solid = topics.filter((t) => indep(t) >= 2);
    p(`### 트렌드 신호 — 수집 ${signals.collectedAt ?? signals.generatedAt ?? '?'}`);
    p();
    p(`후보 ${topics.length}건 중 **독립 신호 2개 이상은 ${solid.length}건**.`);
    p('신호가 하나뿐인 것은 `Emerging online signal` 로만 쓸 수 있고, 그 상태로는 기사 가치가 낮다.');
    p();
    for (const t of solid.slice(0, 10)) {
      const src = [...new Set((t.signals ?? []).map((x) => x.source))].join('·') || '?';
      p(`- [ ] ${t.name ?? t.topic ?? t.title}${t.category ? ` (${t.category})` : ''} — 독립 신호 ${indep(t)}개 [${src}] · ${t.stage ?? 'emerging'}`);
    }
    p();
  } else {
    p('### 트렌드 신호');
    p();
      p('`data/signals/latest.json` 이 없다.');
    p();
    p('`collect-trends` 는 `NAVER_CLIENT_ID` · `NAVER_CLIENT_SECRET` 를 GitHub Secrets 에서 읽는다.');
    p('키가 없으면 `assertCredentials()` 가 던지고 워크플로가 실패한다 — **조용한 성공을 막으려고 그렇게 설계돼 있다.**');
    p('Actions 탭에서 collect-trends 의 마지막 실행이 빨간지 확인한다.');
    p();
  }

  if (radar) {
    p(`### 신작 레이더 — ${radar.generatedAt?.slice(0, 10) ?? '?'}`);
    p();
    p(`총 ${radar.counts?.total ?? 0}건 · 바로 쓸 수 있는 것 **${radar.counts?.ready ?? 0}건**`);
    p();
    for (const b of (radar.briefs ?? []).slice(0, 8)) {
      const ok = b.gate === 'ready';
      p(`- ${ok ? '[ ]' : '~~'}${b.title}${ok ? '' : '~~'} — ${ok ? '쓸 수 있다' : b.reason}`);
    }
    p();
  }
}

if (tally?.blocked?.length) {
  p('### 댓글 빈도 — 몇 명이 같은 곳에서 막혔나');
  p();
  p('개별 진술은 근거가 못 되지만 빈도는 근거가 된다. 1차 출처로 확인한 뒤에만 기사가 된다.');
  p();
  for (const b of tally.blocked.slice(0, 8)) {
    p(`- ${b.what ?? b.topic} — ${b.count ?? b.n}명${b.verified ? ' · 1차 출처 확인됨' : ' · ⬜ 미확인'}`);
  }
  p();
}

/* ── 90일 ─────────────────────────────────────────────────────── */

p('## ④ 90일 재확인');
p();
if (!stale90.length) p('없다. 낡은 요금은 새 글보다 해롭지만, 이번 주에는 해당 없음.');
else {
  p(`**${stale90.length}편 — 새 글보다 먼저.**`);
  p();
  for (const a of stale90.slice(0, 10)) p(`- [ ] \`${a.file}\` — ${a.age}일 · ${a.title ?? ''}`);
}
p();

/* ── 결론 ─────────────────────────────────────────────────────── */

p('## 이번 주 한 줄');
p();
const firstThing =
  debt ? `번역 부채 ${debt}편 정리` :
  stale90.length ? `90일 지난 ${stale90.length}편 재확인` :
  `${gap[0].axis} 축 보강`;
p(`**${firstThing}** 부터.`);
p();
p('선택: `Continue` · `Prioritize` · `Pause`');
p();
p('---');
p();
p('_저장소의 파일과 수집 결과만 읽어서 만든다. 트래픽·수익 숫자 는 여기에 없다 —_');
p('_Search Console 과 AdSense 를 붙이기 전까지 지어내지 않는다._');

console.log(out.join('\n'));
