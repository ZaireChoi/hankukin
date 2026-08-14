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
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const CONTENT_DIR = 'src/content';
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
        /** @type {Map<string, string[]>} 파일명 → 그것을 쓰는 기사들 */
        const used = new Map();

        for (const file of walk(CONTENT_DIR)) {
          const text = readFileSync(file, 'utf8');
          const article = basename(file).replace(/\.mdx?$/, '');
          const seen = new Set();
          for (const m of text.matchAll(IMG_RE)) {
            if (seen.has(m[1])) continue;        // 한 기사 안의 중복 참조는 정상
            seen.add(m[1]);
            used.set(m[1], [...(used.get(m[1]) ?? []), article]);
          }
        }

        const shared = [...used.entries()].filter(([, arts]) => arts.length > 1);
        if (shared.length) {
          const detail = shared
            .map(([img, arts]) => `  ${img}\n${arts.map((a) => `      - ${a}`).join('\n')}`)
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
