/**
 * 기사별 공유 카드(og:image) 생성 — 사진이 없는 기사를 위해.
 *
 * 왜 필요한가 (2026-08-17 외부 평가).
 *   사진이 있는 기사는 대표사진이 그대로 공유 카드가 된다. 문제는 나머지다.
 *   ATM·분실물·기후동행카드·영어페이지 편처럼 **도표로 지탱하는 실용 기사**는
 *   전부 공통 og-default.png 를 쓰고 있었다 — 11편.
 *   그 결과 카카오톡·X·슬랙에 붙였을 때 **어느 기사인지 구분이 안 된다.**
 *   제목이 안 보이는 카드는 클릭될 이유가 없다.
 *
 * 왜 빌드 때 만들지 않고 파일로 커밋하는가.
 *   빌드는 Cloudflare 에서 돈다. 거기에 어떤 글꼴이 깔려 있는지 우리는 모른다.
 *   글꼴이 없으면 글자가 두부(□□□)로 나오고, **그건 아무도 안 본 채로 배포된다.**
 *   이 저장소가 사진에 적용해 온 규율과 같다 — 눈으로 본 것만 나간다.
 *   그래서 여기서 만들어 눈으로 확인하고 커밋한다. 결과는 언제 어디서 빌드해도 같다.
 *
 * 쓰는 법:  node scripts/make-og.mjs
 *   제목이나 확인일이 바뀐 기사만 다시 그린다. 나머지는 건드리지 않는다.
 *   빠진 카드가 있으면 게이트가 빌드를 세운다 (content-quality.mjs).
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'src/content');
const OUT = join(ROOT, 'public/og');

/** 색은 사이트 본문과 같은 계통을 쓴다 — 카드만 따로 놀면 브랜드가 두 개로 보인다. */
const INK = '#12100f';
const ACCENT = '#e07a3c';
const PAPER = '#fdfbf8';
const MUTED = '#8f857b';

const SECTION_LABEL = {
  now: { en: 'HANKUKIN NOW', ja: 'HANKUKIN NOW', 'zh-hans': 'HANKUKIN NOW' },
  scenes: { en: 'HANKUKIN SCENES', ja: 'HANKUKIN SCENES', 'zh-hans': 'HANKUKIN SCENES' },
  decode: { en: 'HANKUKIN DECODE', ja: 'HANKUKIN DECODE', 'zh-hans': 'HANKUKIN DECODE' },
  hangul: { en: 'HANKUKIN HANGUL', ja: 'HANKUKIN HANGUL', 'zh-hans': 'HANKUKIN HANGUL' },
  guides: { en: 'CULTURE & HISTORY', ja: 'CULTURE & HISTORY', 'zh-hans': 'CULTURE & HISTORY' },
};

/*
 * 글꼴 계통.
 *   라틴은 산세리프, CJK 는 Noto CJK 계열로 떨어지게 둔다.
 *   families 를 나열해 두면 rsvg 가 글자마다 있는 것을 고른다.
 */
const FONT = "'DejaVu Sans','Carlito','Noto Sans CJK KR','Noto Sans CJK JP','Noto Sans CJK SC','Noto Serif CJK KR','Noto Serif CJK JP','Noto Serif CJK SC',sans-serif";

/** 대략의 글자폭 — CJK 는 한 칸, 라틴은 반 칸으로 센다. 줄바꿈 계산에만 쓴다. */
const CJK_RE = /[\u1100-\u11FF\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF]/;
/*
 * 2026-08-18. \uAC19\uC740 \uC790\uB9AC\uC5D0\uC11C \uB450 \uBC88\uC9F8\uB85C \uB118\uCCE4\uB2E4.
 *   \u300CMusic Bank Wants Two Names \u2014 and Inkigayo Published Its Rules as a Picture\u300D
 *   \uAC00 "\u2026Its Rules" \uC5D0\uC11C \uC798\uB824 \uB098\uAC14\uB2E4. \uB208\uC73C\uB85C \uC548 \uBD24\uC73C\uBA74 \uADF8\uB300\uB85C \uB098\uAC14\uB2E4.
 *
 *   \uC5B4\uC81C \uACE0\uCCD0 \uB193\uC740 \uC774 \uD45C\uB294 **\uBCF4\uD1B5 \uAD75\uAE30 \uAE30\uC900**\uC774\uC5C8\uB2E4.
 *   \uADF8\uB7F0\uB370 \uC81C\uBAA9\uC740 \uC804\uBD80 \uBCFC\uB4DC(font-weight 700)\uB85C \uADF8\uB9B0\uB2E4. \uBCFC\uB4DC\uB294 10~15% \uB113\uB2E4.
 *   \uACC4\uC0B0\uC73C\uB85C\uB294 16.1\uCE78\uC774\uB77C 16.8\uCE78 \uC0C1\uC790\uC5D0 \u300C\uB4E4\uC5B4\uAC04\uB2E4\u300D\uACE0 \uB098\uC654\uACE0, \uC2E4\uC81C\uB85C\uB294 \uC548 \uB4E4\uC5B4\uAC14\uB2E4.
 *
 *   \uC5B4\uC81C \uC8FC\uC11D\uC5D0 \u300C\uB35C \uB098\uC05C \uCABD\uC73C\uB85C \uC7A1\uC558\uB2E4\u300D\uACE0 \uC801\uC5C8\uB294\uB370, \uB35C \uB098\uC05C \uCABD\uC774 \uC544\uB2C8\uC5C8\uB2E4.
 *   **\uC798\uB9AC\uB294 \uAC83\uC740 \uC791\uC544\uC9C0\uB294 \uAC83\uBCF4\uB2E4 \uD6E8\uC52C \uB098\uC058\uB2E4** \u2014 \uC798\uB9B0 \uC81C\uBAA9\uC740 \uCE74\uB4DC\uB97C \uB9CC\uB4E0 \uC774\uC720\uB97C
 *   \uD1B5\uC9F8\uB85C \uC5C6\uC564\uB2E4. \uADF8\uB798\uC11C \uC774\uBC88\uC5D0\uB294 \uB109\uB109\uD788 \uC7A1\uB294\uB2E4. \uCD5C\uC545\uC740 \uAE00\uC790\uAC00 \uBA87 \uD53D\uC140 \uC791\uC544\uC9C0\uB294 \uAC83.
 *
 *   \uC22B\uC790\uB294 DejaVu Sans Bold \uC758 advance width \uB97C em \uAE30\uC900\uC73C\uB85C \uBC18\uC62C\uB9BC\uD55C \uAC83\uC774\uB2E4.
 *   \uB300\uBB38\uC790\uB97C \uD55C \uB369\uC5B4\uB9AC(0.80)\uB85C \uBB36\uC73C\uBA74 I \uAC19\uC740 \uC881\uC740 \uAE00\uC790\uB97C \uACFC\uB300\uD3C9\uAC00\uD558\uB294\uB370,
 *   **\uADF8 \uBC29\uD5A5\uC758 \uC624\uCC28\uB294 \uC548\uC804\uD558\uB2E4** \u2014 \uC904\uC774 \uC77C\uCC0D \uBC14\uB014 \uBFD0 \uC798\uB9AC\uC9C0 \uC54A\uB294\uB2E4.
 */
const widthOf = (ch) => {
  if (CJK_RE.test(ch)) return 1.05;
  if (ch === ' ') return 0.32;
  if (/[.,'\u2019:;!|il]/.test(ch)) return 0.34;
  if (/[tfrj()\[\]]/.test(ch)) return 0.45;
  if (/[mwMW]/.test(ch)) return 1.00;
  if (/[A-Z0-9\u20A9\u2014\u2013]/.test(ch)) return 0.80;
  return 0.66;
};

/** 한 줄에 들어갈 만큼씩 끊는다. 낱말 중간에서 끊지 않되, CJK 는 어디서든 끊는다. */
function wrap(text, maxUnits) {
  const lines = [];
  let line = '', units = 0;
  const flush = () => { if (line) lines.push(line); line = ''; units = 0; };
  const tokens = text.match(/[ᄀ-ᇿ⺀-꓏가-힣豈-﫿＀-｠]|[^\sᄀ-ᇿ⺀-꓏가-힣豈-﫿＀-｠]+|\s+/g) ?? [];
  for (const tk of tokens) {
    const w = [...tk].reduce((a, c) => a + widthOf(c), 0);
    if (units + w > maxUnits && line.trim()) { flush(); if (/^\s+$/.test(tk)) continue; }
    line += tk; units += w;
  }
  flush();
  return lines.map((l) => l.trim()).filter(Boolean);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function card({ kicker, title, footL, footR }) {
  /*
   * 제목 길이에 따라 글자 크기를 낮춘다.
   * 한 카드에 다 안 들어가면 뒤를 자르는 대신 작게 만든다 —
   * 잘린 제목은 「무슨 기사인지 모르겠다」로 읽히고, 그게 이 카드를 만든 이유다.
   */
  /*
   * 2026-08-17. 처음 낸 영어 카드가 오른쪽으로 삐져나갔다 — "…in Korea Th" 에서 잘렸다.
   * 눈으로 안 봤으면 28장이 그대로 나갔다. 이제 상자 폭(1040px)을 em 으로 나눠서 센다.
   * 폭을 낮게 잡으면 잘리고 높게 잡으면 글자만 작아진다 — 덜 나쁜 쪽으로 잡았다.
   */
  const BOX = 1040;                    // 1200 − 좌우 여백 80씩
  let size = 62;
  let lines = wrap(title, BOX / size);
  while (lines.length > 4 && size > 34) {
    size -= 4;
    lines = wrap(title, BOX / size);
  }
  const lh = Math.round(size * 1.24);
  const blockH = lines.length * lh;
  const top = Math.round((630 - blockH) / 2) + Math.round(size * 0.78) - 10;

  const tspans = lines
    .map((l, i) => `<tspan x="80" y="${top + i * lh}">${esc(l)}</tspan>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${INK}"/>
  <rect x="0" y="0" width="14" height="630" fill="${ACCENT}"/>
  <text x="80" y="96" font-family="${FONT}" font-size="24" font-weight="700"
        letter-spacing="4" fill="${ACCENT}">${esc(kicker)}</text>
  <text font-family="${FONT}" font-size="${size}" font-weight="700" fill="${PAPER}">${tspans}</text>
  <text x="80" y="562" font-family="${FONT}" font-size="25" font-weight="700" fill="${PAPER}">${esc(footL)}</text>
  <text x="1120" y="562" text-anchor="end" font-family="${FONT}" font-size="23" fill="${MUTED}">${esc(footR)}</text>
</svg>`;
}

/* ── 기사 훑기 ───────────────────────────────────────────────── */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (['.md', '.mdx'].includes(extname(p))) out.push(p);
  }
  return out;
}

const field = (fm, key) => {
  const m = new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|(\\S.*?))\\s*$`, 'm').exec(fm);
  return (m?.[1] ?? m?.[2] ?? m?.[3] ?? '').trim();
};

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const wanted = new Set();
let made = 0, kept = 0;

for (const file of walk(CONTENT)) {
  const text = readFileSync(file, 'utf8');
  const fm = text.slice(0, text.indexOf('\n---', 4) + 4);
  if (/^draft:\s*true/m.test(fm)) continue;

  const slug = basename(file).replace(/\.mdx?$/, '');
  const lang = field(fm, 'lang') || 'en';
  const parent = basename(dirname(file));
  const section = parent === lang ? basename(dirname(dirname(file))) : parent;

  // 대표사진이 있으면 그것이 공유 카드가 된다. 카드를 만들지 않는다.
  if (/^hero:/m.test(fm)) continue;
  /*
   * 2026-08-22. 번역본은 이제 hero 를 안 적고 원문에서 물려받는다 (src/config/hero.mjs).
   * 그러니 「hero: 가 없다」만 보면 번역본 전부가 사진 없는 기사로 보이고,
   * 화면에는 원문 사진이 나가는데 쓰이지도 않을 카드를 9장 더 그리게 된다.
   * heroAlt 는 원문에 사진이 있을 때만 적히므로, 그것이 곧 「물려받을 사진이 있다」는 표시다.
   */
  if (/^heroAlt:/m.test(fm)) continue;

  const title = field(fm, 'title');
  const checked = field(fm, 'checkedAt');
  if (!title) continue;

  const name = `${section}__${slug}__${lang}.png`;
  wanted.add(name);
  const dest = join(OUT, name);

  const kicker = SECTION_LABEL[section]?.[lang] ?? 'HANKUKIN';
  const footR = checked ? `checked ${checked}` : '';
  const svg = card({ kicker, title, footL: 'hankuk-in.com', footR });

  // 같은 그림이면 다시 쓰지 않는다 — git 이 매번 바뀐 것으로 보지 않도록.
  const stamp = `<!--${Buffer.from(title + '|' + checked).toString('base64')}-->`;
  if (existsSync(dest)) {
    const prev = readFileSync(dest);
    if (prev.includes(Buffer.from(stamp))) { kept++; continue; }
  }
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  // 어떤 제목으로 그렸는지 파일 안에 남긴다 — 다음 실행이 비교할 수 있게.
  const withStamp = await sharp(png).withMetadata({ exif: {} }).toBuffer();
  writeFileSync(dest, Buffer.concat([withStamp, Buffer.from(stamp)]));
  made++;
}

// 기사가 사라졌는데 카드만 남는 일을 막는다.
let removed = 0;
for (const f of readdirSync(OUT)) {
  if (f.endsWith('.png') && !wanted.has(f)) { writeFileSync(join(OUT, f), ''); removed++; }
}

console.log(`\n공유 카드 — 새로 그림 ${made}장 · 그대로 둠 ${kept}장${removed ? ` · 주인 없는 파일 ${removed}장 비움` : ''}`);
console.log(`대상은 대표사진이 없는 기사입니다. 사진이 있으면 그 사진이 카드가 됩니다.\n`);
