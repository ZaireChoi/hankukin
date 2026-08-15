/**
 * 발행 전 자체 점검 — 운영자가 지적하기 전에 빌드가 먼저 잡는다.
 *
 * 왜 만들었나 (2026-08-14).
 *
 *   운영자가 하루 동안 지적한 것들 — 같은 사진 돌려쓰기, 도표 글자 겹침,
 *   정적인 사진만 있다는 것 — 은 **전부 이미 _주제은행.md 에 적혀 있던 규칙**이었다.
 *   규칙을 몰라서 어긴 것이 아니라, 적어 두고 확인하지 않아서 어겼다.
 *
 *   그러므로 규칙을 하나 더 적는 것은 해결이 아니다.
 *   기계가 볼 수 있는 것은 기계가 보게 하고,
 *   사람만 볼 수 있는 것(사진이 이 기사에 어울리는가)에 사람의 눈을 남긴다.
 *
 * 여기서 막는 것 — 확인만 하면 알 수 있는데 놓쳤던 것들.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const CONTENT_DIR = 'src/content';

/**
 * 대표사진이 없어도 되는 기사와 그 이유.
 *
 * "모든 글에 사진이 있어야 한다" 는 원칙이지만, 없는 사진을 지어낼 수는 없다.
 * 다만 예외는 **이유를 적어야** 통과한다. 이유를 적기 귀찮으면 사진을 넣게 된다.
 * 사진이 도착하면 이 줄을 지우는 것이 할 일 목록이 된다.
 */
const HERO_EXEMPT = {
  'seoul-to-busan-ktx-srt-integration-2026':
    '부산·수서역·서울역 사진이 한 장도 없다. 서울역으로 받았던 6장은 실제로 ' +
    '서울역사박물관이었다 (간판이 사진에 찍혀 있다). 다른 도시 사진으로 대신하면 ' +
    '거짓이 된다. data/photo-requests.json 에 부산역·해운대·감천문화마을이 ' +
    '올라가 있으므로 수집되면 채우고 이 줄을 지운다.',

  // 2026-08-14 저녁: 창덕궁 인정문 사진이 도착해 예외를 해제했다.
  //   TourAPI 에 '창덕궁' 본궁은 없지만 '창덕궁 인정문' 은 있었고,
  //   요청서에 exactTitle 로 등재명을 직접 지정하니 6장이 들어왔다.
  //   목록이 비어 있는 것이 정상 상태다. 예외를 추가할 때는 반드시 사유를 적을 것.
};

const TITLE_MAX = 62;   // 검색 결과에서 잘리는 대략의 길이
const IMG_SUBJ = /assets\/images\/[\w/-]+\/([\w.-]+)\.(?:jpg|jpeg|png|webp|avif)/gi;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (['.md', '.mdx'].includes(extname(p))) out.push(p);
  }
  return out;
}

export default function contentQuality() {
  return {
    name: 'hankukin:content-quality',
    hooks: {
      'astro:build:start': ({ logger }) => {
        const fail = [];
        const warn = [];

        for (const file of walk(CONTENT_DIR)) {
          const text = readFileSync(file, 'utf8');
          const slug = basename(file).replace(/\.mdx?$/, '');
          const fm = text.slice(0, text.indexOf('\n---', 4) + 4);
          const body = text.slice(fm.length);

          // ── 1. 대표사진 ─────────────────────────────────────────
          if (!/^hero:/m.test(fm) && !HERO_EXEMPT[slug]) {
            fail.push(
              `${slug}: 대표사진이 없습니다.\n` +
              '      사진을 넣거나, 넣을 수 없다면 그 이유를 ' +
              'src/integrations/content-quality.mjs 의 HERO_EXEMPT 에 적으십시오.',
            );
          }

          // ── 2. 캡션 없는 사진 ───────────────────────────────────
          // 캡션은 사진이 말하지 않는 것을 말하는 자리다.
          // 없으면 사진이 그냥 장식으로 붙은 것이고, 그건 우리 방식이 아니다.
          const figures = body.match(/<Figure[\s\S]*?\/>/g) ?? [];
          const noCaption = figures.filter((f) => !/caption=/.test(f));
          if (noCaption.length) {
            fail.push(`${slug}: 캡션 없는 사진 ${noCaption.length}장. 캡션은 선택이 아닙니다.`);
          }

          // ── 3. 본문 시각 요소 ───────────────────────────────────
          // 대표사진만 있고 본문이 글자만이면 끝까지 읽히지 않는다.
          const charts = (body.match(/<Chart\w+/g) ?? []).length;
          if (figures.length + charts === 0) {
            warn.push(`${slug}: 본문에 사진·도표가 하나도 없습니다 (대표사진만 있음)`);
          }

          // ── 3-b. 사진이 전부 한 곳인가 ──────────────────────────
          //
          // 2026-08-14 운영자: "궁궐 사진이 아직 중복적으로 사용된 것이 보인다".
          //   파일은 전부 달랐다. 그런데 14장이 **전부 경복궁**이었다.
          //   5대궁 기사도, 단청도, 한복도 경복궁만 보여준다.
          //   파일명이 다른 것과 다른 곳을 보여주는 것은 다른 말이다.
          //
          //   파일명 첫 토큰을 피사체로 본다 (gyeongbokgung-geunjeongjeon-hall → gyeongbokgung).
          //   기사 슬러그에 그 이름이 없는데 사진이 전부 그 한 곳이면 알린다.
          const shots = [...text.matchAll(IMG_SUBJ)].map((m) => m[1].split('-')[0].toLowerCase());
          const subjects = new Set(shots);
          if (shots.length >= 2 && subjects.size === 1) {
            const only = [...subjects][0];
            if (!slug.toLowerCase().includes(only)) {
              warn.push(
                `${slug}: 사진 ${shots.length}장이 전부 '${only}' 한 곳입니다. ` +
                '읽는 사람에게는 같은 곳을 반복해 보여주는 것으로 읽힙니다.',
              );
            }
          }

          // ── 4. 제목 길이 ────────────────────────────────────────
          const title = /^title:\s*"(.+?)"\s*$/m.exec(fm)?.[1];
          if (title && title.length > TITLE_MAX) {
            warn.push(`${slug}: 제목 ${title.length}자 — 검색 결과에서 잘립니다 (${TITLE_MAX}자 권장)`);
          }

          // ── 5. 내부 링크 ────────────────────────────────────────
          // 한 편만 읽고 떠나면 쌓인 글이 일하지 않는다.
          const links = (body.match(/\]\(\/en\//g) ?? []).length;
          if (links === 0) warn.push(`${slug}: 다른 기사로 가는 링크가 없습니다`);
        }

        for (const w of warn) logger.warn(w);

        if (fail.length) {
          throw new Error(
            `발행 기준을 통과하지 못한 기사 ${fail.length}건.\n\n` +
            fail.map((f) => `  ✗ ${f}`).join('\n\n') + '\n',
          );
        }

        const exempt = Object.keys(HERO_EXEMPT).length;
        logger.info(
          `발행 기준 통과${exempt ? ` (대표사진 예외 ${exempt}건 — 사유 기재됨)` : ''}` +
          `${warn.length ? `, 경고 ${warn.length}건` : ''}`,
        );
      },
    },
  };
}
