#!/usr/bin/env node
/**
 * 링크 점검 — 발행된 글의 바깥으로 나가는 모든 주소를 검사한다.
 *
 * 이 파일이 있는 이유는 2026-08-16 하루에 세 번 증명됐다.
 *   ① 도시 ID 를 추측해 만든 Klook 주소가 404 였다. 생성기는 받아줬다.
 *   ② /transport/ 주소는 리디렉션에서 aid 가 사라진다. 페이지는 열리는데 수수료가 0이 된다.
 *   ③ 주문진 지도 링크의 퍼센트 인코딩이 한 글자 어긋나 「죫문진」 을 검색하고 있었다.
 *
 * 셋 다 **열어 보면 보이고 코드로는 안 보이던 것**이다. 그래서 코드가 보게 만든다.
 *
 * 규칙은 둘로 나뉜다.
 *   오프라인  — 네트워크 없이 판정한다. 실패하면 발행을 막는다.
 *   온라인    — 실제로 열어 본다. GitHub Actions 에서만 돈다.
 *
 * 사용법
 *   node scripts/link-check.mjs --offline    규칙 검사만 (로컬·빌드 전)
 *   node scripts/link-check.mjs              규칙 + 실제 접속 (CI)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const CONTENT = join(ROOT, 'src/content');
const VERIFIED_PATH = join(ROOT, 'data/link-verified.json');
const RESULT_PATH = join(ROOT, 'data/link-check.result.json');

const OFFLINE = process.argv.includes('--offline');
const STALE_DAYS = 90;

/* ── 파일 모으기 ───────────────────────────────────────────────── */

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.mdx') || name.endsWith('.md')) out.push(p);
  }
  return out;
}

/* ── frontmatter 에서 주소를 뽑되 **어느 블록**인지 함께 기억한다 ──
 *
 * 어느 블록인지가 규칙을 가른다. sources 의 klook 주소는 '출처'이고
 * visitKorea 의 klook 주소는 '수수료가 걸린 링크'다. 같은 주소라도 다르게 본다.
 * YAML 파서를 새로 들이지 않는 이유는, 우리 frontmatter 가
 * 스키마로 이미 고정돼 있어서 형태가 흐들리지 않기 때문이다.
 */
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { block: '', links: [], checkedAt: null, sourcesCheckedAt: [] };
  const fm = m[1];
  const links = [];
  const sourcesCheckedAt = [];
  let topKey = '';
  let lastLabel = '';
  for (const line of fm.split(/\r?\n/)) {
    const top = line.match(/^([A-Za-z][A-Za-z0-9_]*):/);
    if (top) topKey = top[1];
    const label = line.match(/^\s+-?\s*(?:label|title):\s*["']?(.*?)["']?\s*$/);
    if (label) lastLabel = label[1];
    const url = line.match(/^\s+-?\s*url:\s*["']?(https?:\/\/[^"'\s]+)["']?/);
    if (url) links.push({ url: url[1], block: topKey, label: lastLabel });
    const ca = line.match(/^\s+checkedAt:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
    if (ca && topKey === 'sources') sourcesCheckedAt.push(ca[1]);
  }
  const checkedAt = (fm.match(/^checkedAt:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/m) || [])[1] || null;
  return { block: fm, links, checkedAt, sourcesCheckedAt };
}

function bodyLinks(raw) {
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
  const out = [];
  const patterns = [
    /\]\((https?:\/\/[^)\s]+)\)/g,   // 마크다운 링크
    /(?:url|href)=["'](https?:\/\/[^"']+)["']/g, // 컴포넌트 prop · 순수 HTML
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(body))) out.push({ url: m[1], block: 'body', label: '' });
  }
  return out;
}

/* ── 규칙 ──────────────────────────────────────────────────────── */

const fails = [];
const warns = [];
const fail = (file, rule, msg) => fails.push({ file, rule, msg });
const warn = (file, rule, msg) => warns.push({ file, rule, msg });

/** 제휴 링크 — 눈으로 본 것만, 그리고 추적되는 형태로만 */
function ruleAffiliate(file, link, verified) {
  const { url, block } = link;
  if (!/klook\.com/i.test(url)) return;
  if (block !== 'visitKorea' && block !== 'bringKoreaHome') return;

  const bare = url.split('?')[0];
  if (!/\/activity\//.test(bare)) {
    fail(file, 'affiliate-path',
      `${bare} — /activity/ 가 아니다. /transport/ · /rails-*/ 는 리디렉션에서 aid 가 사라져 수수료가 0이 된다.`);
    return;
  }
  const known = Object.keys(verified.verified || {}).some((v) => v.split('?')[0] === bare);
  if (!known) {
    fail(file, 'affiliate-unverified',
      `${bare} — data/link-verified.json 에 없다. 열어 보고 제목·404·utm_campaign 을 확인한 뒤 등재한다.`);
  }
  for (const r of verified.rejected || []) {
    if (r.url.split('?')[0] === bare) fail(file, 'affiliate-rejected', `${bare} — 이미 반려된 주소다: ${r.why}`);
  }
}

/**
 * 지도 링크 — 퍼센트 인코딩이 본문의 한국어와 **글자 단위로** 같은지 본다.
 *
 * 「죫문진」 은 정상적인 한글 음절이라 인코딩만으로는 잡을 수 없었다.
 * 잡히는 자리는 하나뿐이다 — 본문은 「주문진」 이라고 적고 있었다.
 * 링크 속 이름이 글에 없으면, 둘 중 하나는 틀린 것이다.
 */
function ruleMapQuery(file, link, raw) {
  const { url } = link;
  if (!/%[0-9A-Fa-f]{2}/.test(url)) return;
  let decoded;
  try { decoded = decodeURIComponent(url); } catch {
    fail(file, 'map-encoding', `${url} — 퍼센트 인코딩이 깨져 디코딩되지 않는다.`);
    return;
  }
  const korean = decoded.match(/[가-힣]{2,}/g) || [];
  const body = raw.replace(/https?:\/\/[^\s"')]+/g, ' '); // 주소 자신은 근거가 못 된다
  for (const word of new Set(korean)) {
    if (!body.includes(word)) {
      fail(file, 'map-name-mismatch',
        `링크가 「${word}」 을 검색하는데 본문에 그 말이 없다. 인코딩이 한 글자 어긋났을 수 있다 (2026-08-15 주문진 → 죫문진).`);
    }
  }
}

/** 낡은 요금은 새 글보다 해롭다 */
function ruleStale(file, checkedAt, today) {
  if (!checkedAt) return;
  const age = Math.floor((today - new Date(checkedAt)) / 86400000);
  if (age > STALE_DAYS) warn(file, 'stale', `checkedAt ${checkedAt} — ${age}일 지났다. 새 글보다 먼저 재확인한다.`);
}

/* ── 온라인 점검 ──────────────────────────────────────────────── */

async function probe(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  const opts = {
    redirect: 'follow',
    signal: ctl.signal,
    headers: { 'user-agent': 'HANKUKIN-link-check/1.0 (+https://www.hankuk-in.com/en/about/)' },
  };
  try {
    let res = await fetch(url, { ...opts, method: 'HEAD' });
    if (res.status === 405 || res.status === 501) res = await fetch(url, { ...opts, method: 'GET' });
    return { status: res.status, finalUrl: res.url };
  } catch (e) {
    return { status: 0, error: String(e.message || e) };
  } finally { clearTimeout(t); }
}

const AID = '131289';

/**
 * 제휴 링크는 **독자가 실제로 누르는 형태**로 열어야 한다.
 *
 * frontmatter 에 적힌 주소에는 aid 가 없다. 붙이는 것은 템플릿이다.
 * 그래서 맨 주소를 열어 놓고 '추적이 없다' 고 판정하면 매번 거짓 실패가 난다.
 * 독자가 누르는 주소를 그대로 만들어서 연다.
 */
const asClicked = (url, block) => {
  if (block !== 'visitKorea' && block !== 'bringKoreaHome') return url;
  if (!/klook\.com/i.test(url) || /[?&]aid=/.test(url)) return url;
  return url + (url.includes('?') ? '&' : '?') + `aid=${AID}`;
};

async function checkOnline(entries) {
  const results = {};
  const queue = [...entries];
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const { url, files, block } = queue.shift();
      const target = asClicked(url, block);
      let r = await probe(target);
      if (r.status === 0 || r.status >= 500) { await sleep(2000); r = await probe(target); }
      results[url] = { ...r, probed: target };

      const where = files[0];
      if (r.status === 0) {
        warn(where, 'unreachable', `${url} — 접속 실패 (${r.error}). 일시적인 수 있어 경고로 둔다.`);
      } else if (r.status === 404 || r.status === 410) {
        fail(where, 'dead-link', `${url} — ${r.status}. 죽은 주소다.`);
      } else if (r.status >= 400) {
        warn(where, 'blocked', `${url} — ${r.status}. 봇 차단일 수 있다. 사람이 한 번 열어 본다.`);
      }
      // 수수료가 걸린 링크는 '열린다' 로 부족하다. 최종 주소까지 aid 가 살아 있어야 한다.
      // /transport/ 로 리디렉션되면 여기서 파라미터가 사라진다 — 페이지는 열리고 수수료만 0이 된다.
      // 다만 봇 차단(403 등)으로 최종 주소를 못 본 경우는 판정하지 않는다. 모르는 것과 틀린 것은 다르다.
      if (target !== url && r.finalUrl && r.status > 0 && r.status < 400) {
        if (!new RegExp(`(aid=|utm_campaign=)${AID}`).test(r.finalUrl)) {
          fail(where, 'affiliate-tracking-lost',
            `${target} → ${r.finalUrl} — 최종 주소에 추적 파라미터가 없다. 열리지만 수수료가 0이다.`);
        }
      }
      await sleep(400); // 상대 서버에 대한 예의이자, 차단당하지 않기 위한 것
    }
  });
  await Promise.all(workers);
  return results;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── 실행 ─────────────────────────────────────────────────────── */

const verified = JSON.parse(readFileSync(VERIFIED_PATH, 'utf8'));
const files = walk(CONTENT);
const today = new Date();
const byUrl = new Map();

for (const path of files) {
  const rel = relative(ROOT, path).replace(/\\/g, '/');
  const raw = readFileSync(path, 'utf8');
  const fm = parseFrontmatter(raw);
  const links = [...fm.links, ...bodyLinks(raw)];

  ruleStale(rel, fm.checkedAt, today);
  for (const link of links) {
    ruleAffiliate(rel, link, verified);
    ruleMapQuery(rel, link, raw);
    const key = link.url;
    if (!byUrl.has(key)) byUrl.set(key, { url: key, files: [], block: link.block });
    const e = byUrl.get(key);
    if (!e.files.includes(rel)) e.files.push(rel);
    if (link.block === 'visitKorea' || link.block === 'bringKoreaHome') e.block = link.block;
  }
}

let online = {};
if (!OFFLINE) online = await checkOnline([...byUrl.values()]);

const report = {
  ranAt: today.toISOString().slice(0, 10),
  mode: OFFLINE ? 'offline' : 'online',
  articles: files.length,
  urls: byUrl.size,
  fails,
  warns,
  online,
};
writeFileSync(RESULT_PATH, JSON.stringify(report, null, 2) + '\n');

const line = (x) => `  ${x.rule.padEnd(24)} ${x.file}\n      ${x.msg}`;
console.log(`\n링크 점검 — 기사 ${files.length}편 · 주소 ${byUrl.size}개 · ${OFFLINE ? '오프라인' : '실접속'}\n`);
if (warns.length) {
  console.log(`경고 ${warns.length}건 (발행은 막지 않는다)`);
  warns.forEach((w) => console.log(line(w)));
  console.log('');
}
if (fails.length) {
  console.log(`실패 ${fails.length}건 — 고치기 전에는 발행하지 않는다`);
  fails.forEach((f) => console.log(line(f)));
  console.log('');
  process.exit(1);
}
console.log('통과. 나가는 주소 전부가 규칙을 지키고 있다.\n');
