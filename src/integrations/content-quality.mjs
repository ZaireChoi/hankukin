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

  'korean-clinic-pharmacy-signs':
    '의료기관 간판 사진이 재고에 없고, 있어도 문제다 — 의료기관 앞·안의 ' +
    '식별 가능한 사람은 쓰지 않기로 했다 (그 사람은 아파서 거기 있었다). ' +
    '거리 사진을 붙이면 주제와 무관한 「그냥 한국」 사진이 된다. ' +
    '이 기사가 가르치는 것은 간판 문자열의 구조라서 해부도가 사진보다 낫다 — ' +
    'eSIM 편과 같은 판단. 의료기관 간판이 크게 찍힌 무인물 사진이 생기면 그때 채운다.',

  'korean-bang-suffix-noraebang-jjimjilbang':
    '노래방·찜질방·빨래방 간판 사진이 재고에 없다. 미사용분인 이태원 5장을 ' +
    '전부 열어 봤지만 등재명이 「이태원시장」 인 옷가게 실내였다 — 이 주제의 사진이 아니고, ' +
    '거리 사진을 붙이면 주제와 무관한 「그냥 한국」 사진이 된다. ' +
    '이 기사가 가르치는 것은 낱말의 조립 방식이라 등식 도해가 사진보다 낫다 — ' +
    '병원 간판편과 같은 판단. 방(房) 간판이 크게 찍힌 무인물 거리 사진이 생기면 그때 채운다.',

  'korea-3d-secure-card-declined-online':
    '결제 실패 화면은 남의 결제 정보라 찍을 수 없고, 찍어도 특정 카드사·특정 가맹점의 ' +
    '한 사례일 뿐이라 오히려 오해를 만든다. 이 기사의 값은 증상으로 벽을 구분하는 ' +
    '진단이라 도해가 사진보다 낫다 — eSIM 편과 같은 판단. 이 기사에는 앞으로도 채우지 않는다.',

  'korea-esim-no-phone-number':
    'eSIM 은 **사진으로 찍을 수 있는 물건이 아니다.** 실물이 없다. ' +
    '상품 페이지의 사진은 QR 코드 그림이고 그건 아무것도 설명하지 않는다. ' +
    '거리 사진을 붙이면 주제와 무관한 「그냥 한국」 사진이 되고, 그건 우리가 안 쓰기로 한 것이다. ' +
    '이 기사가 말하려는 것은 **경계선**이라 도표가 사진보다 낫다 — ' +
    '데이터로 되는 일과 한국 번호가 있어야 되는 일 사이의 선. ' +
    '가을편이 단풍 사진 없이 산림청 도표로 지탱한 것과 같은 판단이다. ' +
    '사진이 생기면 채우는 것이 아니라, 이 기사에는 앞으로도 채우지 않는다.',

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
        const shapes = [];   // 절 구성 비교용 — 판정은 반복문이 끝난 뒤

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

          // ── 6. 절 구성을 모아 둔다 (판정은 반복문이 끝난 뒤) ──────
          shapes.push({
            slug,
            at: /^publishedAt:\s*(\S+)/m.exec(fm)?.[1] ?? '',
            // **마지막 절 하나**를 본다.
            //
            // 처음에는 절 제목 전체를 이어붙여 비교했다. 만들어 놓고 시험해 보니
            // **한 번도 안 걸렸다.** 글마다 절 제목이 조금씩 달라 문자열이 늘 달랐기 때문이다.
            // 안 터지는 게이트는 게이트가 아니라 장식이다.
            //
            // 실제로 세어 보니 냄새는 제목이 아니라 **꼬리**에 있었다:
            //   30편 중 **29편**이 'What this article does not claim' 으로 끝난다.
            // 독자가 세 편째에 알아채는 것이 바로 이것이다. 그러면 이것을 겨눠야 한다.
            shape: ((body.match(/^##\s+(.+)$/gm) ?? []).at(-1) ?? '')
              .replace(/^##\s+/, '').trim().toLowerCase(),
            words: body.split(/\s+/).length,
          });
        }

        /*
         * ── 7. 같은 틀로 찍어내지 않았는가 ──────────────────────────
         *
         * 2026-08-16 운영자 지시: "AI 자동화의 느낌과 냄새를 완전히 제거하자."
         * 외부 평가도 같은 것을 지적했다 — 개별 항목은 훌륭한데 30편이 같은 순서,
         * 같은 말투라 몇 편만 읽으면 자동 생산 시스템이라는 것이 느껴진다고.
         *
         * 이 규칙은 이미 _자동화-지시문.md 에 있었다.
         *   "개념 설명 글에 고지할 게 없으면 절을 통째로 뺀다"
         * 그런데 30/30 이 모든 절을 다 갖고 있다. **글로 적힌 규칙은 안 지켜졌다.**
         * 안 지켜지는 규칙은 규칙이 아니라 희망이다. 그래서 코드로 내린다.
         *
         * 적용 시점을 나눈 이유.
         *   오늘 기존 30편을 다시 쓸 수는 없다. 지금 전면 적용하면 빌드가 영영 안 선다.
         *   그러면 이 게이트는 꺼지거나 우회될 것이고, 우회되는 게이트는 없는 것만 못하다.
         *   **오늘 이후 쓰는 글부터 적용한다.** 기존 편은 경고로만 계속 보인다 —
         *   잊지 않기 위해서다. 부채를 조용히 덮으면 갚지 않게 된다.
         */
        const SHAPE_RULE_FROM = '2026-08-16';
        const RUN = 4;   // 연속 4편이 같은 구성이면 세운다 = '직전 3편과 같으면 안 된다'

        const sorted = shapes.filter((s) => s.at).sort((a, b) => a.at.localeCompare(b.at));
        for (let i = RUN - 1; i < sorted.length; i++) {
          const run = sorted.slice(i - RUN + 1, i + 1);
          if (run.some((r) => !r.shape)) continue;
          if (new Set(run.map((r) => r.shape)).size !== 1) continue;

          const line = run.map((r) => r.slug).join('\n    ');
          if (run[run.length - 1].at >= SHAPE_RULE_FROM) {
            fail.push(
              `연속 ${RUN}편이 똑같은 절로 끝납니다 — "${run[0].shape}"\n    ${line}\n\n` +
              '    같은 틀로 찍은 글은 몇 편만 읽어도 티가 납니다.\n' +
              '    고지할 것이 없으면 고지 절을 **통째로 빼고**, 할 말이 끝났으면 거기서 끝내십시오.\n' +
              '    절을 하나 더 채우려고 쓴 문단은 독자도 그렇게 읽습니다.',
            );
            break;
          }
        }

        // 기존 편의 쏠림은 경고로 계속 보여준다 — 갚아야 할 부채다.
        const old = shapes.filter((s) => s.at && s.at < SHAPE_RULE_FROM);
        const byShape = new Map();
        for (const s of old) byShape.set(s.shape, (byShape.get(s.shape) ?? 0) + 1);
        const worst = [...byShape.entries()].sort((a, b) => b[1] - a[1])[0];
        if (worst && worst[1] >= 3) {
          warn.push(
            `${SHAPE_RULE_FROM} 이전 기사 ${old.length}편 중 ${worst[1]}편이 절 구성이 동일합니다 ` +
            '— 재확인 주기에 한 편씩 손보십시오',
          );
        }

        /**
         * ── 상업 링크가 조용히 사라지는 것을 막는다 ───────────────────
         *
         * 2026-08-16 밤에 찾았다. eSIM 편 frontmatter 에 Klook 제휴 링크가
         * 적혀 있었는데 **화면에는 없었다.** decode 와 hangul 템플릿이
         * CtaBlock 을 렌더링하지 않았기 때문이다.
         * 스키마는 통과, 빌드도 통과, 링크만 사라진다. **아무 소리도 안 났다.**
         *
         * 이 사이트에서 다섯 번 반복된 모양이다 — 한 군데 고치고 옆을 안 본 것.
         * 그래서 기억이 아니라 **파일을 읽어서** 확인한다.
         * 새 축을 만들면 이 검사가 저절로 그 축을 포함한다.
         */
        const PAGE_DIR = 'src/pages/[lang]';
        for (const sec of readdirSync(PAGE_DIR)) {
          const tpl = join(PAGE_DIR, sec, '[slug].astro');
          let src;
          try { src = readFileSync(tpl, 'utf8'); } catch { continue; }
          if (!/<CtaBlock/.test(src)) {
            fail.push(
              `${sec} — 기사 템플릿이 CtaBlock 을 렌더링하지 않습니다 (${tpl}).\n` +
              '    이 축의 기사가 visitKorea / bringKoreaHome 링크를 적어도\n' +
              '    화면에는 아무것도 나오지 않고, 오류도 나지 않습니다.\n' +
              '    실제로 eSIM 편의 Klook 제휴 링크가 이렇게 사라져 있었습니다.',
            );
          }
          // 상단 고지도 같은 방식으로 지킨다 (2026-08-16 외부 검토 수용).
          // 고지는 손으로 쓰지 않고 링크 배열에서 계산되므로,
          // 템플릿이 컴포넌트를 빼먹는 것이 이 고지가 사라지는 유일한 경로다.
          if (!/<AffiliateTopNote/.test(src)) {
            fail.push(
              `${sec} — 기사 템플릿이 AffiliateTopNote 를 렌더링하지 않습니다 (${tpl}).\n` +
              '    제휴 링크가 있는 기사의 상단 고지가 이 축에서만 조용히 빠집니다.',
            );
          }
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
