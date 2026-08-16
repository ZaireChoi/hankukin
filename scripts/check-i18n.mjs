/**
 * 다국어 신호 검사 — 빌드 결과물(dist)을 실제로 읽어서 확인한다.
 *
 * 왜 별도 스크립트인가.
 *   빌드 게이트는 **소스**를 본다. 이 검사는 **출력물**을 본다.
 *   이 사이트에서 제일 비싼 버그 두 개가 전부 「소스는 맞는데 출력이 다른」 종류였다:
 *     · canonical 이 /en/now/foo 를 가리키는데 실제 주소는 /en/now/foo/ 였다 (30편 전부)
 *     · 제휴 링크가 frontmatter 에 있는데 화면에 안 그려졌다 (오류 없음)
 *   **소스를 읽어서는 둘 다 못 잡는다.**
 *
 * 쓰는 법:  node scripts/check-i18n.mjs
 * (npm run build 를 먼저 돌린 뒤에 실행한다)
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const fail = [];
const seen = [];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name === 'index.html' || name === '404.html') out.push(p);
  }
  return out;
}

if (!existsSync(DIST)) {
  console.error('dist 가 없습니다. npm run build 를 먼저 실행하십시오.');
  process.exit(1);
}

for (const file of walk(DIST)) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(DIST, file).replace(/\\/g, '/');
  const isNoindex = /name="robots"\s+content="noindex/.test(html);
  // dist/en/now/foo/index.html → /en/now/foo/
  const urlPath = rel === '404.html' ? '/404.html'
    : `/${rel.replace(/index\.html$/, '')}`;
  seen.push(urlPath);

  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  const alts = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)]
    .map((m) => ({ lang: m[1], href: m[2] }));

  // ── 1. canonical 은 자기 주소를 가리켜야 한다 ───────────────────
  // 번역본의 canonical 을 영어로 보내면 그 언어 페이지는 색인에서 사라진다.
  if (rel !== '404.html' && !isNoindex) {
    if (!canonical) fail.push(`${urlPath} — canonical 이 없습니다`);
    else if (new URL(canonical).pathname !== urlPath) {
      fail.push(
        `${urlPath} — canonical 이 자기 주소를 가리키지 않습니다\n` +
        `      canonical : ${new URL(canonical).pathname}\n` +
        `      실제 주소 : ${urlPath}`,
      );
    }
  }

  // ── 2. hreflang 이 가리키는 주소가 실제로 있어야 한다 ─────────────
  // 없는 번역을 있다고 선언하면 크롤러가 404 를 받는다.
  for (const a of alts) {
    if (a.lang === 'x-default') continue;
    const p = new URL(a.href).pathname;
    const target = join(DIST, p.replace(/^\//, ''), 'index.html');
    if (!existsSync(target)) {
      fail.push(
        `${urlPath} — hreflang="${a.lang}" 이 없는 페이지를 가리킵니다\n` +
        `      ${p}\n` +
        '      없는 번역을 있다고 선언하는 것입니다.',
      );
    }
  }

  // ── 3. 제휴 링크의 추적 파라미터가 살아 있어야 한다 ───────────────
  // 링크는 멀쩡히 열리고 수수료만 0 이 되는 실패다. 눈으로는 절대 못 본다.
  for (const m of html.matchAll(/href="(https:\/\/www\.klook\.com[^"]*)"/g)) {
    const u = new URL(m[1].replace(/&amp;/g, '&'));
    if (!u.searchParams.get('aid')) {
      fail.push(`${urlPath} — Klook 링크에 aid 가 없습니다: ${u.pathname}`);
    }
    if (!/\/activity\//.test(u.pathname)) {
      fail.push(`${urlPath} — Klook 링크가 /activity/ 가 아닙니다 (aid 가 리디렉션에서 사라집니다): ${u.pathname}`);
    }
  }

  // ── 4. 제휴 링크에는 rel="sponsored" 가 있어야 한다 ──────────────
  for (const m of html.matchAll(/<a[^>]*href="https:\/\/www\.klook\.com[^"]*"[^>]*>/g)) {
    if (!/rel="[^"]*sponsored/.test(m[0])) {
      fail.push(`${urlPath} — Klook 링크에 rel="sponsored" 가 없습니다`);
    }
  }
}

// ── 5. 내부 링크가 실제로 존재하는가 ────────────────────────────
//
// 2026-08-17. 일본어를 켠 직후 내부 링크가 **27건** 깨져 있었다.
//   /ja/hangul/**ja/**korean-restaurant-signs-last-word/   ← 언어 폴더를 안 벗김
//   /ja/about/  /ja/contact/  /ja/ledger/                  ← 영어판만 있는 페이지
// 빌드는 통과했다. 게이트도 통과했다. **화면을 열어야만 보이는 종류였다.**
//
// 그래서 출력물에서 직접 센다. 새 언어를 켤 때마다 같은 실수가 나올 것이고,
// 사람이 기억할 일이 아니다.
for (const file of walk(DIST)) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(DIST, file).replace(/\\/g, '/');
  const from = rel === '404.html' ? '/404.html' : `/${rel.replace(/index\.html$/, '')}`;
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1];
    if (href.startsWith('/_astro') || /\.(xml|png|svg|ico|txt|json|webp|jpg)$/.test(href)) continue;
    const target = join(DIST, href.replace(/^\/|\/$/g, ''), 'index.html');
    if (!existsSync(target)) {
      fail.push(
        `${from} — 내부 링크가 없는 페이지를 가리킵니다\n` +
        `      ${href}\n` +
        '      언어 폴더를 안 벗겼거나(publicSlug), 그 언어판이 아직 없는 페이지입니다.\n' +
        '      src/config/links.mjs 의 pageHref / articleHref 를 쓰십시오.',
      );
    }
  }
}

// ── 6. 캐시 규칙이 있는가 ────────────────────────────────────────
//
// 2026-08-17. 운영자가 스타일이 통째로 빠진 화면을 만났다.
// 원인은 **예전 HTML 이 캐시돼 있고 그 HTML 이 가리키는 CSS 는 사라진 것**이었다.
// Astro 는 빌드마다 자산 이름에 새 해시를 붙이므로, 배포를 자주 하면 반드시 겪는다.
//
// public/_headers 가 없으면 이 상태가 다시 온다. 그래서 존재를 강제한다.
{
  const headers = join(DIST, '_headers');
  if (!existsSync(headers)) {
    fail.push(
      'public/_headers 가 없습니다 — 캐시 규칙이 배포되지 않습니다.\n' +
      '      HTML 을 캐시하면 사라진 CSS 를 가리키게 되고, 화면이 통째로 깨집니다.\n' +
      '      HTML 은 must-revalidate, /_astro/* 는 immutable 로 두십시오.',
    );
  } else {
    const h = readFileSync(headers, 'utf8');
    if (!/must-revalidate/.test(h) || !/immutable/.test(h)) {
      fail.push(
        'public/_headers 에 캐시 규칙이 불완전합니다.\n' +
        '      HTML: must-revalidate · /_astro/*: immutable — 둘 다 있어야 합니다.',
      );
    }
  }
}

console.log(`검사한 페이지 ${seen.length}개`);
if (fail.length) {
  console.error(`\n실패 ${fail.length}건:\n`);
  for (const f of fail) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log('canonical · hreflang · 제휴 추적 · sponsored — 전부 통과');
