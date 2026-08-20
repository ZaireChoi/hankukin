/**
 * 같은 사진이 두 기사에 들어가면 빌드를 세운다.
 *
 * 왜 이것이 필요한가 (2026-08-14, 운영자 지적: "다른 글에 같은 사진들이 공유되고 있어").
 *
 *   사진이 부족하면 손이 가장 가까운 사진으로 간다. 그렇게 근정전 한 장이
 *   기사 네 편에 들어가 있었다. 독자에게는 같은 곳을 계속 보여주는 것으로 읽히고,
 *   "이 사진의 풍경 앞에 서 보고 싶다" 는 마음이 생길 이유가 사라진다.
 *
 *   한 번 손으로 고치면 다음 달에 다시 생긴다. 그래서 규칙을 코드로 옮긴다.
 *   사진이 모자라면 기사에서 사진을 빼거나 새로 받아야지, 돌려쓰면 안 된다.
 *
 * 예외를 두지 않는다. 예외를 허용하는 순간 전부가 예외가 된다.
 *
 * 2026-08-20 — 번역판을 다른 기사로 세고 있었다.
 *
 *   이태원 편에 사진을 넣자 빌드가 섰다. 같은 사진이 세 기사에 있다면서
 *   기사 이름을 **세 번 똑같이** 찍어 놓았다. 영어·일본어·중국어판이었다.
 *   기사를 파일명(basename)으로만 식별하고 있어서, 언어 폴더가 사라진 것이다.
 *
 *   이 게이트가 막으려던 것은 **독자가 다른 글에서 같은 풍경을 또 보는 일**이다.
 *   번역판은 다른 글이 아니라 같은 글이다. 오히려 세 언어가 같은 사진을 써야 맞다.
 *   그래서 기사의 신원을 「구획 + 슬러그」로 잡고 언어는 뺀다.
 *
 *   사진 있는 기사를 번역한 것이 이번이 처음이라 여태 안 드러났다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, basename, relative, sep } from 'node:path';
import { PLANNED_LOCALES } from '../config/brand.mjs';

const CONTENT_DIR = 'src/content';

/**
 * 기사의 신원 — 언어를 뺀 「구획/슬러그」.
 *   src/content/scenes/itaewon.mdx          → scenes/itaewon
 *   src/content/scenes/ja/itaewon.mdx       → scenes/itaewon
 *   src/content/scenes/zh-hans/itaewon.mdx  → scenes/itaewon
 */
function articleKey(file) {
  const parts = relative(CONTENT_DIR, file).split(sep);
  const slug = basename(parts.pop(), extname(file));
  return [...parts.filter((p) => !PLANNED_LOCALES.includes(p)), slug].join('/');
}
const IMG_RE = /assets\/images\/[\w/-]+\/([\w.-]+\.(?:jpg|jpeg|png|webp|avif))/gi;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (['.md', '.mdx'].includes(extname(p))) out.push(p);
  }
  return out;
}

export default function noSharedImages() {
  return {
    name: 'hankukin:no-shared-images',
    hooks: {
      'astro:build:start': ({ logger }) => {
        /** @type {Map<string, Set<string>>} 파일명 → 그것을 쓰는 기사들 (언어 제외) */
        const used = new Map();

        for (const file of walk(CONTENT_DIR)) {
          const text = readFileSync(file, 'utf8');
          const article = articleKey(file);
          for (const m of text.matchAll(IMG_RE)) {
            // Set 이라 한 기사 안의 중복 참조도, 번역판도 한 번으로 접힌다
            if (!used.has(m[1])) used.set(m[1], new Set());
            used.get(m[1]).add(article);
          }
        }

        const shared = [...used.entries()].filter(([, arts]) => arts.size > 1);
        if (shared.length) {
          const detail = shared
            .map(([img, arts]) => `  ${img}\n${[...arts].map((a) => `      - ${a}`).join('\n')}`)
            .join('\n');
          throw new Error(
            `사진 ${shared.length}장이 여러 기사에 중복 사용되었습니다.\n${detail}\n\n` +
            '기사마다 다른 사진을 쓰거나, 사진이 없으면 그 자리를 비워 두십시오.\n' +
            'data/photo-requests.json 에 장소를 추가하면 다음 수집 때 받아옵니다.',
          );
        }

        logger.info(`사진 ${used.size}장 · 중복 없음`);
      },
    },
  };
}
