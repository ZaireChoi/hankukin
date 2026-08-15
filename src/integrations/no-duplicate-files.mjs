/**
 * 내용이 같은 사진이 두 벌 들어와 있으면 빌드를 세운다.
 *
 * 왜 필요한가 (2026-08-15).
 *
 *   `no-shared-images` 는 **파일 이름**이 두 기사에 겹치는지 본다.
 *   그런데 수집기가 같은 장소를 다른 슬러그로 두 번 받아오면
 *   이름이 다르므로 그 검사를 그냥 통과한다.
 *
 *   실제로 그랬다 — '벚꽃'(서울) 요청이 이미 받아 둔 '안양천제방벚꽃길' 에
 *   매칭돼 5장이 **바이트 단위로 동일하게** 두 벌 저장됐다.
 *   두 기사에 나눠 쓰면 독자에게는 같은 사진이고, 우리 검사는 통과한다.
 *
 *   이름이 아니라 내용을 봐야 잡힌다.
 *
 * 저장 용량이 아니라 **독자가 같은 사진을 두 번 보는 것**이 문제다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, extname, basename } from 'node:path';

const IMAGE_DIR = 'src/assets/images';
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (EXT.has(extname(p).toLowerCase())) out.push(p);
  }
  return out;
}

export default function noDuplicateFiles() {
  return {
    name: 'hankukin:no-duplicate-files',
    hooks: {
      'astro:build:start': ({ logger }) => {
        /** @type {Map<string, string[]>} 해시 → 파일들 */
        const byHash = new Map();
        for (const file of walk(IMAGE_DIR)) {
          const h = createHash('md5').update(readFileSync(file)).digest('hex');
          byHash.set(h, [...(byHash.get(h) ?? []), basename(file)]);
        }
        const dupes = [...byHash.values()].filter((f) => f.length > 1);
        if (dupes.length) {
          throw new Error(
            `내용이 같은 사진이 ${dupes.length}쌍 있습니다.\n\n` +
            dupes.map((f) => `  ${f.join('  ==  ')}`).join('\n') +
            '\n\n같은 장소를 다른 슬러그로 두 번 받았을 가능성이 큽니다.\n' +
            '한 벌을 지우고 data/place-images.json 과 photo-requests.json 에서도 지우십시오.\n',
          );
        }
        logger.info(`사진 ${byHash.size}장 · 내용 중복 없음`);
      },
    },
  };
}
