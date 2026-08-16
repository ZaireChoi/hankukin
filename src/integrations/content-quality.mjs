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
import { ALLOWED_LABELS } from '../config/products.mjs';
import { UI, flatKeys } from '../config/ui.mjs';
import { LOCALES } from '../config/brand.mjs';

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

  'seoul-climate-card-ending-what-visitors-should-buy':
    '기후동행카드 실물 카드·역사 발매기 사진이 재고에 없다. 그리고 이 기사가 ' +
    '전달하는 것은 **날짜**다 — 8/31 충전 마감, 9/29 최종 이용, 10/1 종료. ' +
    '카드 사진을 붙이면 「이 카드를 사라」로 읽히는데, 이 기사의 결론은 그 반대다. ' +
    '표 두 개(일정·단기권 가격)가 사진보다 정확히 그 일을 한다 — eSIM 편과 같은 판단. ' +
    '다만 이건 사진이 없어도 되는 기사가 아니라 **없는 기사**다. 서울 지하철 역사의 ' +
    '교통카드 발매기 무인물 사진이 생기면 그때 채운다.',

  'korea-3d-secure-card-declined-online':
    '결제 실패 화면은 남의 결제 정보라 찍을 수 없고, 찍어도 특정 카드사·특정 가맹점의 ' +
    '한 사례일 뿐이라 오히려 오해를 만든다. 이 기사의 값은 증상으로 벽을 구분하는 ' +
    '진단이라 도해가 사진보다 낫다 — eSIM 편과 같은 판단. 이 기사에는 앞으로도 채우지 않는다.',

  'kpop-concert-tickets-korea-foreigners':
    '서울 공연장 사진이 재고에 없다. 미사용분인 올림픽공원 2·6번을 대조표로 열어 봤으나 ' +
    '6장 전부 **올림픽공원피크닉장** (등재명도 그렇다) — 눈 덮인 잔디와 벤치, 앙상한 나무이고 ' +
    'KSPO돔은 어느 프레임에도 없다. 겨울편이 이미 같은 묶음에서 4장을 쓰고 있다. ' +
    '공원 사진을 붙이면 주제와 무관한 「그냥 한국」 사진이 되고, 그건 우리가 안 쓰기로 한 것이다. ' +
    '이 기사가 말하는 것은 **자격 심사의 순서**라 일정 도표가 사진보다 낫다 — ' +
    'eSIM 편·3D Secure 편과 같은 판단. KSPO돔·잠실실내체육관이 크게 찍힌 사진이 생기면 그때 채운다.',

  'korea-atm-foreign-card-cash':
    'ATM 화면·카드 슬롯 사진은 재고에 없고, 있어도 **한 대의 기계는 답이 아니다.** ' +
    '이 기사의 요지는 특정 은행이 아니라 「기계에 찍힌 네트워크 마크를 보라」는 판별법이라, ' +
    '어느 은행 ATM 한 대를 크게 찍어 놓으면 오히려 그 은행이 답이라는 오해를 만든다. ' +
    '그리고 ATM 앞의 식별 가능한 사람은 찍지 않기로 했다 — 그 사람은 돈을 뽑는 중이었다. ' +
    '3D Secure 편·eSIM 편과 같은 판단. 이 기사에는 앞으로도 채우지 않는다.',

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
          /*
           * 번역본은 대표사진 검사를 하지 않는다 (2026-08-17).
           *
           * 번역본은 **같은 기사의 다른 언어판**이지 새 기사가 아니다.
           * 원문이 이미 이 검사를 통과했고, 사진을 frontmatter 에 복사해 두면
           * 원문에서 사진을 바꿀 때 번역본만 옛 사진을 가리키게 된다 —
           * 이 사이트가 오늘 하루에 여섯 번 반복한 바로 그 모양이다.
           * 사진은 한 곳에만 적는다.
           */
          const isTranslation = /^translation:/m.test(fm);
          if (!isTranslation && !/^hero:/m.test(fm) && !HERO_EXEMPT[slug]) {
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
         * ── 「무엇이 막혔나요」 색인이 조용히 낡는 것을 막는다 ──────────
         *
         * 2026-08-17 실측: 기사 35편 중 색인에 든 것이 **16편**이었다.
         * 3D Secure 편처럼 이번 주에 쓴 가장 좋은 글도 빠져 있었다.
         * 아무도 뭘 잘못하지 않았다. **그냥 안 넣었고, 안 넣은 걸 아무도 몰랐다.**
         *
         * 그렇다고 전부 넣을 수는 없다 — 촬영지·계절 기사는 '막힌 순간' 이 아니다.
         * 그래서 넣거나, **이유를 적고 빼거나** 둘 중 하나를 하게 만든다.
         * 사진 예외 목록과 같은 방식이다. 이유를 적기 귀찮으면 넣게 된다.
         */
        const stuckExempt = {
          // 갈 곳 이야기지 막힌 순간이 아니다. 독자가 '어떡하지' 하고 검색하지 않는다
          'geoje-island-what-to-see': '촬영지·여행지 소개. 막힌 순간이 없다',
          'goblin-jumunjin-breakwater': '촬영지 소개',
          'gyeongju-at-night-silla-capital': '여행지 소개',
          'kpop-demon-hunters-still-popular-korea': '현상 분석. 독자가 막혀서 찾는 글이 아니다',
          'yeokjuhaeng-korean-chart-reverse-running': '현상 해설',
          'what-koreans-search-for-trends-2026': '데이터 해설',
          // 계획 단계의 글이다. 막힌 게 아니라 아직 안 떠났다
          'best-time-to-visit-korea-calendar': '출발 전 계획. 현장에서 막히는 순간이 아니다',
          'when-do-cherry-blossoms-bloom-korea': '출발 전 계획',
          'korea-autumn-foliage-when-and-where': '출발 전 계획',
          'when-does-it-snow-in-korea': '출발 전 계획',
          'korea-summer-heat-humidity': '출발 전 계획. 현장 대처는 아직 안 썼다 — 쓰면 색인에 넣는다',
          // 배경 지식. 몰라도 통과에 지장이 없다
          'dancheong-why-palaces-are-painted': '배경 지식. 몰라도 막히지 않는다',
          'what-is-donggung-the-east-palace': '배경 지식',
        };
        try {
          const stuck = JSON.parse(readFileSync('data/stuck.json', 'utf8'));
          const listed = new Set(stuck.groups.flatMap((g) => g.items.map((i) => i.href)));
          const drifted = [];
          for (const file of walk(CONTENT_DIR)) {
            const slug = basename(file).replace(/\.mdx?$/, '');
            let sec = basename(join(file, '..'));
            /*
             * 번역본은 이 검사의 대상이 아니다 (2026-08-17).
             *
             * 「무엇이 막혔나요」 색인은 **영어로 쓰인 물건**이고,
             * 항목의 answer 도 영어다. 번역본이 색인에 없다고 표시하면
             * 영어 색인에 일본어 기사를 넣으라는 뜻이 되는데, 그건 틀렸다.
             * 색인 자체를 언어별로 만들 때 이 검사도 언어별로 돈다.
             */
            const fm = readFileSync(file, 'utf8').slice(0, 800);
            if (/^translation:/m.test(fm)) continue;
            if (listed.has(`${sec}/${slug}`) || stuckExempt[slug]) continue;
            drifted.push(`${sec}/${slug}`);
          }
          if (drifted.length) {
            fail.push(
              `「무엇이 막혔나요」 색인에 없고 예외 사유도 없는 기사 ${drifted.length}건.\n` +
              drifted.map((d) => `      · ${d}`).join('\n') + '\n\n' +
              '    둘 중 하나를 하십시오.\n' +
              '      ① data/stuck.json 에 넣는다 — 독자의 말로 된 문제 + 한 줄 답\n' +
              '      ② stuckExempt 에 **이유를 적고** 뺀다 (막힌 순간이 아니라면)\n\n' +
              '    2026-08-17 에 35편 중 19편이 이렇게 조용히 빠져 있었습니다.',
            );
          }
        } catch (e) {
          if (e.code !== 'ENOENT') throw e;
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

        /**
         * ── 공개 대장이 없는 주소를 가리키는 것을 막는다 (여덟 번째) ──────
         *
         * 2026-08-17 외부 검토가 잡았다.
         *   대장에 /en/guides/korean-street-food-hidden-pork-and-fish/ 라고 적혀 있었다.
         *   실제 주소는 /en/now/... 다. 축을 옮기고 대장을 안 고친 것이다.
         *
         * 이게 왜 다른 깨진 링크보다 나쁜가.
         *   대장은 **우리가 틀렸다고 인정한 기록**이다.
         *   "여기서 틀렸습니다" 하고 가리킨 곳에 글이 없으면,
         *   정정을 확인하려던 사람이 확인하지 못한다.
         *   투명성 장치가 작동하지 않으면 투명성의 **주장만** 남는다.
         *
         * 「무엇이 막혔나요」 색인에는 이 검사가 있었는데 대장에는 없었다.
         * 같은 모양을 또 한 군데만 고친 것이다.
         */
        const LEDGER_SCAN_DIR = 'src/content';
        const liveUrls = new Set();
        for (const sec of readdirSync(LEDGER_SCAN_DIR)) {
          let files;
          try { files = readdirSync(join(LEDGER_SCAN_DIR, sec)); } catch { continue; }
          for (const f of files) {
            if (!/\.mdx?$/.test(f)) continue;
            const raw = readFileSync(join(LEDGER_SCAN_DIR, sec, f), 'utf8');
            const lang = (raw.match(/^lang:\s*(\S+)/m) ?? [])[1] ?? 'en';
            liveUrls.add(`/${lang}/${sec}/${f.replace(/\.mdx?$/, '')}/`);
          }
        }
        let ledger;
        try {
          ledger = JSON.parse(readFileSync('data/ledger.json', 'utf8'));
        } catch { ledger = null; }
        if (ledger) {
          const rows = Object.values(ledger)
            .filter(Array.isArray)
            .flat()
            .filter((r) => r && typeof r.article === 'string');
          for (const r of rows) {
            // 사이트 밖(정책 페이지 등)을 가리키는 항목은 이 검사의 대상이 아니다.
            if (!/^\/[a-z]{2}\/[a-z]+\//.test(r.article)) continue;
            if (!liveUrls.has(r.article)) {
              fail.push(
                `공개 대장이 없는 기사를 가리킵니다 — ${r.article}\n` +
                `    항목 : ${(r.wrong ?? r.title ?? '').slice(0, 70)}\n` +
                '    대장은 우리가 틀렸다고 인정한 기록입니다.\n' +
                '    가리킨 자리에 글이 없으면 정정을 확인할 방법이 없습니다.',
              );
            }
          }
        }

        /**
         * ── 상품 하나에 이름 하나 (아홉 번째) ────────────────────────
         *
         * 2026-08-17. 같은 Klook 상품이 두 곳에 붙어 있었는데
         * eSIM 편에서는 "data only — no 010 number" 로 고쳤고
         * Arrival 페이지에서는 "buy before you fly" 로 남아 있었다.
         * 게다가 Arrival 본문은 "gives you a working 010 number" 라고 썼다.
         *
         * **한 사이트가 같은 물건을 두고 두 말을 했다.**
         * 독자에게는 둘 다 우리 말이라, 어느 쪽을 믿어도 우리가 틀린 것이 된다.
         *
         * 정식 라벨은 src/config/products.mjs 한 곳에만 있다.
         * frontmatter 가 같은 URL 에 다른 라벨을 쓰면 여기서 세운다.
         */
        for (const file of walk(CONTENT_DIR)) {
          const text = readFileSync(file, 'utf8');
          const slug = basename(file).replace(/\.mdx?$/, '');
          for (const [url, allowed] of Object.entries(ALLOWED_LABELS)) {
            const i = text.indexOf(url);
            if (i === -1) continue;
            // 같은 항목 안의 label 을 찾는다 (URL 바로 앞 몇 줄).
            const near = text.slice(Math.max(0, i - 400), i);
            const label = [...near.matchAll(/label:\s*"([^"]+)"/g)].at(-1)?.[1];
            if (label && !allowed.has(label)) {
              fail.push(
                `${slug}: 상품 라벨이 정식 이름과 다릅니다.\n` +
                `    상품 : ${url}\n` +
                `    정식 : ${[...allowed].map((l) => `"${l}"`).join(' / ')}\n` +
                `    기사 : "${label}"\n` +
                '    같은 물건을 두 이름으로 부르면 둘 중 하나는 독자를 속입니다.\n' +
                '    고치려면 src/config/products.mjs 를 바꾸십시오 (거기가 유일한 자리입니다).',
              );
            }
          }
        }

        /**
         * ── 번역본이 낡은 채로 발행되는 것을 막는다 (열 번째) ────────
         *
         * 2026-08-17, 다국어 구조를 켜면서 **번역보다 먼저** 넣는다.
         *
         * 이틀 동안 eSIM 편을 네 번 고쳤다. 4개 언어였으면 열여섯 번이다.
         * 그리고 그 이틀 동안 내가 「한 군데 고치고 옆을 안 보는」 실수를 여섯 번 했다.
         * **원문이 바뀐 것을 사람이 기억해서 번역본을 따라 고칠 수는 없다.**
         *
         * 판정은 날짜 하나로 끝난다.
         *   번역본의 translation.sourceCheckedAt  <  원문의 checkedAt   → 낡음
         *
         * 그리고 machine_translated 는 어떤 경우에도 발행되지 않는다.
         * 기계번역을 그대로 내보내는 것이 정확히 scaled content abuse 이고,
         * 우리가 파는 「확인한 것만 쓴다」는 약속이 언어 수만큼 깨진다.
         */
        const byId = new Map();          // 'now/slug' → { checkedAt, file }
        const translations = [];
        for (const file of walk(CONTENT_DIR)) {
          const text = readFileSync(file, 'utf8');
          const slug = basename(file).replace(/\.mdx?$/, '');
          const sec = file.split(/[\\/]/).at(-2);
          const fm = text.slice(0, text.indexOf('\n---', 4) + 4);
          const checkedAt = /^checkedAt:\s*(\S+)/m.exec(fm)?.[1] ?? '';
          const lang = /^lang:\s*(\S+)/m.exec(fm)?.[1] ?? 'en';
          if (lang === 'en') byId.set(`${sec}/${slug}`, { checkedAt, slug });
          if (/^translation:/m.test(fm)) {
            translations.push({
              slug, lang,
              of: /^\s+of:\s*['"]?([^'"\n]+)/m.exec(fm)?.[1]?.trim() ?? '',
              srcAt: /^\s+sourceCheckedAt:\s*(\S+)/m.exec(fm)?.[1] ?? '',
              status: /^\s+status:\s*(\S+)/m.exec(fm)?.[1] ?? '',
              factsAt: /^\s+factsVerifiedAt:\s*(\S+)/m.exec(fm)?.[1] ?? '',
              reviewer: /^\s+reviewer:\s*(\S+)/m.exec(fm)?.[1] ?? '',
            });
          }
        }
        for (const t of translations) {
          /*
           * 2026-08-17. 원어민 검수자가 없다는 것이 **영구 조건**이 됐다.
           * 그러면 native_reviewed 는 실수로든 습관으로든 켜지면 안 된다.
           * 켜려면 읽은 사람의 실명이 있어야 한다. 이름 없는 검수는 검수가 아니다.
           */
          if (t.status === 'native_reviewed' && !t.reviewer) {
            fail.push(
              `${t.slug} (${t.lang}): native_reviewed 인데 reviewer 가 없습니다.\n` +
              '    누가 읽었는지 적을 수 없다면 읽지 않은 것입니다.\n' +
              '    원어민 검수가 없는 것이 현재 운영 조건입니다 —\n' +
              '    ai_translated_facts_verified 를 쓰고 화면에 그대로 고지하십시오.',
            );
            continue;
          }
          /*
           * 사실 확인 날짜가 없으면 「사실은 확인했다」고 말할 수 없다.
           * 이 상태값의 이름 자체가 약속이므로, 약속의 근거를 강제한다.
           */
          if (t.status === 'ai_translated_facts_verified' && !t.factsAt) {
            fail.push(
              `${t.slug} (${t.lang}): factsVerifiedAt 이 없습니다.\n` +
              '    이 상태는 「사실을 1차 출처로 다시 확인했다」는 뜻입니다.\n' +
              '    확인한 날을 적을 수 없다면 확인하지 않은 것이고,\n' +
              '    그러면 machine_translated 이지 이 상태가 아닙니다.',
            );
            continue;
          }
          if (t.status === 'machine_translated') {
            fail.push(
              `${t.slug} (${t.lang}): 기계번역 상태로는 발행할 수 없습니다.\n` +
              '    사람이 읽고 status 를 reviewed 로 바꾸기 전에는 나가지 않습니다.\n' +
              '    읽지 않은 번역을 내보내면 「확인한 것만 쓴다」가 언어 수만큼 거짓이 됩니다.',
            );
            continue;
          }
          const src = byId.get(t.of);
          if (!src) {
            fail.push(
              `${t.slug} (${t.lang}): 번역 원문을 찾을 수 없습니다 — translation.of = "${t.of}"\n` +
              '    원문이 없는 번역본은 갱신 여부를 영영 판정할 수 없습니다.',
            );
            continue;
          }
          if (src.checkedAt && t.srcAt && src.checkedAt > t.srcAt) {
            fail.push(
              `${t.slug} (${t.lang}): 번역본이 낡았습니다.\n` +
              `    원문 확인일 : ${src.checkedAt}\n` +
              `    번역 기준일 : ${t.srcAt}\n` +
              '    원문이 그 뒤에 바뀌었습니다. 번역을 갱신하고 sourceCheckedAt 을 맞추거나,\n' +
              '    당장 못 하면 이 번역본을 draft 로 내리십시오.\n' +
              '    **틀린 채로 서 있는 번역이 없는 번역보다 나쁩니다.**',
            );
          }
        }

        /**
         * ── 껍데기가 반쯤 영어인 채로 나가는 것을 막는다 (열한 번째) ──
         *
         * 2026-08-17. 일본어 기사 5편을 쓰고 빌드했더니 **기사만** 일본어였다.
         * 헤더·푸터·목록 페이지가 전부 영어로 남아 있었고, 빌드는 통과했다.
         * 화면을 열어 보기 전에는 아무도 몰랐다 — 이 사이트의 단골 실패 유형이다.
         *
         * 운영자 판단이 분명했다: 「들어가면 껍데기까지 그 언어로 보여야 한다.」
         *
         * 그래서 **발행 중인 모든 언어가 영어와 같은 키를 다 갖고 있어야** 통과한다.
         * 없는 문구를 영어로 대체하는 방식은 쓰지 않는다 —
         * 대체는 문제를 숨기는 것이지 푸는 것이 아니다.
         */
        {
          const base = flatKeys(UI.en);
          for (const lang of LOCALES) {
            if (lang === 'en') continue;
            const have = new Set(flatKeys(UI[lang] ?? {}));
            const missing = base.filter((k) => !have.has(k));
            if (missing.length) {
              fail.push(
                `화면 문구가 ${missing.length}개 빠졌습니다 — ${lang}\n` +
                missing.slice(0, 12).map((k) => `      · ${k}`).join('\n') +
                (missing.length > 12 ? `\n      … 외 ${missing.length - 12}개` : '') + '\n' +
                '    src/config/ui.mjs 에 추가하거나, 준비될 때까지 brand.mjs 의\n' +
                '    LOCALES 에서 이 언어를 빼십시오.\n' +
                '    **반쯤 번역된 화면은 「번역이 있다」가 아니라 「미완성이다」로 읽힙니다.**',
              );
            }
          }
        }

        /**
         * ── 번역본에서 상업 링크가 조용히 사라지는 것을 막는다 (열두 번째) ──
         *
         * 2026-08-17 운영자 지적: *"일본어와 중국어 버전은 제휴가 없네"*
         *
         * 세어 보니 사실이었다.
         *   en  6페이지 · ja 1페이지 · zh-hans 1페이지
         * 원문에는 붙어 있는 링크를 **번역할 때 frontmatter 에서 빠뜨렸다.**
         *
         * 이게 왜 다른 누락보다 나쁜가.
         *   번역본이 원문보다 **많으면** 게이트가 잡는다 (라벨 대조).
         *   그런데 **적은 것**은 아무도 안 잡는다. 오류도 경고도 안 난다.
         *   이 사이트에서 제일 비쌌던 실패가 전부 이 모양이었다 —
         *   **오류 없이 사라지는 것.**
         *
         * 일부러 빼는 경우는 있다. 그 상품이 그 시장에 없거나,
         * 그 독자에게는 다른 상품이 맞을 때. 그러면 **이유를 적어야 통과한다.**
         * 대표사진 예외와 같은 방식이다 — 이유를 적기 귀찮으면 링크를 넣게 된다.
         */
        const CTA_DROP_EXEMPT = {
          // 'ja/scenes/some-article': '그 상품은 일본에서 안 팔린다. 확인일 2026-08-17',
        };
        {
          const byId = new Map();     // 영어 원문 id → 상업 링크 URL 집합
          const trans = [];
          for (const file of walk(CONTENT_DIR)) {
            const text = readFileSync(file, 'utf8');
            const fm = text.slice(0, text.indexOf('\n---', 4) + 4);
            const slug = basename(file).replace(/\.mdx?$/, '');
            /*
             * 번역본은 src/content/<섹션>/<언어>/<slug>.mdx 라서
             * 한 단계 위가 언어 폴더다. 섹션은 그 위에 있다.
             * 이걸 놓치면 예외 키가 'ja/ja/...' 로 나오고, 적어 둔 예외가 영영 안 걸린다.
             */
            const parent = basename(join(file, '..'));
            const lang = /^lang:\s*(\S+)/m.exec(fm)?.[1] ?? 'en';
            const sec = parent === lang ? basename(join(file, '..', '..')) : parent;
            const urls = new Set([...fm.matchAll(/^\s+url:\s*"(https:\/\/www\.klook\.com[^"]+)"/gm)].map((m) => m[1]));
            if (lang === 'en') byId.set(`${sec}/${slug}`, urls);
            else if (/^translation:/m.test(fm)) {
              trans.push({ key: `${lang}/${sec}/${slug}`, lang, slug,
                of: /^\s+of:\s*['"]?([^'"\n]+)/m.exec(fm)?.[1]?.trim() ?? '', urls });
            }
          }
          for (const t of trans) {
            const src = byId.get(t.of);
            if (!src) continue;                      // 원문 없음은 열 번째 게이트가 잡는다
            const missing = [...src].filter((u) => !t.urls.has(u));
            if (missing.length && !CTA_DROP_EXEMPT[t.key]) {
              fail.push(
                `${t.slug} (${t.lang}): 원문에 있는 상업 링크가 번역본에 없습니다 ${missing.length}건.\n` +
                missing.map((u) => `      · ${u}`).join('\n') + '\n' +
                '    번역하면서 frontmatter 의 visitKorea 를 빠뜨린 것입니다.\n' +
                '    일부러 뺀 것이라면 content-quality.mjs 의 CTA_DROP_EXEMPT 에\n' +
                `    '${t.key}' 키로 **이유를 적으십시오.**\n` +
                '    번역본이 원문보다 적은 것은 오류 없이 사라집니다 — 그래서 여기서 셉니다.',
              );
            }
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
