/**
 * 공공누리 유형이 대장과 맞는지 본다.
 *
 * 왜 별도 파일인가 (2026-09-07).
 *
 *   이 검사는 content-quality.mjs 안에 있어도 된다. 그런데 그러면 **시험할 수가 없다** —
 *   그 파일은 astro 통합이라 빌드를 통째로 돌려야 실행된다.
 *   그리고 이 게이트를 만든 날, 샌드박스 디스크가 꽉 차서 `npm ci` 조차 못 돌렸다.
 *
 *   「안 우는 게이트는 없는 게이트보다 나쁘다」가 이 저장소의 규칙이다.
 *   빌드를 못 돌린다고 시험을 건너뛰면, **시험되지 않은 게이트를 운영자의 자동 푸시에
 *   밀어 넣는 것**이 된다. 자동 푸시는 10분마다 돌고 빌드가 깨지면 발행이 멈춘다.
 *   실제로 2026-08-19 에 그렇게 이틀치를 잃었다.
 *
 *   그래서 의존성 없는 함수로 떼어 놓는다. node 하나로 부를 수 있으면
 *   빌드 없이도 **일부러 깨뜨려 우는지 확인**할 수 있다.
 *
 * 무엇을 막나.
 *
 *   공공누리 제3유형은 '출처표시 + **변경금지**' 다. Figure.astro 는 license 를 보고
 *   3유형이면 원본을 그대로 내보내고, 1유형이면 Astro <Image> 를 태운다 —
 *   리사이즈와 WebP 변환, 즉 licence 가 금지한 '변경' 이다.
 *
 *   가드는 이미 있었다(Figure.astro 의 NO_MODIFY). 그런데 그 가드는
 *   **우리가 건네준 값을 믿는다.** 값이 틀리면 가드는 조용히 통과시킨다.
 *   2026-09-07 에 제주 편 사진 넷이 정확히 그 상태였다. 원인은 한 줄이었다:
 *
 *       const KTO = { credit: '한국관광공사…', license: 'kogl-1' };
 *       const SINCHANG = { ...KTO, sourceUrl: … };
 *
 *   **유형은 기관의 속성이 아니라 사진의 속성이다.** 같은 기관 안에서 갈리고,
 *   같은 장소의 사진 여섯 장 안에서도 갈린다 (거제 매미성이 실제로 그렇다).
 *   「이 기관 것은 1유형」 이라는 한 줄이 그 아래 전부를 한꺼번에 틀리게 만든다.
 *
 * 방향에 따라 무게가 다르다.
 *   느슨하게 선언 (대장 3유형 → 선언 1유형)  빌드를 세운다. licence 위반이다
 *   엄격하게 선언 (대장 1유형 → 선언 3유형)  경고만. 허용된 최적화를 안 할 뿐, 손해는 우리 것이다
 */
import { readFileSync } from 'node:fs';

/** 변경(리사이즈·포맷 변환)이 금지된 유형. Figure.astro 의 NO_MODIFY 와 같아야 한다. */
export const NO_MODIFY = new Set(['kogl-3']);

/** data/place-images.json → Map<파일이름, licence>. 못 읽으면 빈 Map (검사를 건너뛴다). */
export function loadLicenceRegistry(path = 'data/place-images.json') {
  try {
    const reg = JSON.parse(readFileSync(path, 'utf8'));
    const map = new Map();
    for (const p of reg.places ?? []) {
      for (const im of p.images ?? []) {
        if (im?.file && im?.frontmatter?.license) map.set(im.file, im.frontmatter.license);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * 기사 원문에서 «이미지 파일 → 선언된 licence» 를 뽑는다.
 *
 * 세 자리를 본다. 셋째가 사고가 난 자리다.
 *   ① frontmatter 의 hero 블록
 *   ② <Figure license="…">
 *   ③ <Figure {...OBJ}> — OBJ 가 다시 다른 객체를 전개하면 **타고 올라간다**
 */
export function declaredLicences(text) {
  const out = [];

  const fmEnd = text.indexOf('\n---', 4);
  const fm = fmEnd > 0 ? text.slice(0, fmEnd + 4) : '';
  const heroBlk = /^hero:\s*\n((?:[ \t]+.*\n)+)/m.exec(fm)?.[1];
  if (heroBlk) {
    const f = /src:\s*\S*\/([a-z0-9-]+\.(?:jpg|jpeg|png))/i.exec(heroBlk)?.[1];
    const l = /license:\s*["']?([\w-]+)/.exec(heroBlk)?.[1];
    if (f && l) out.push({ where: 'hero', file: f, declared: l });
  }

  const imports = new Map();
  for (const m of text.matchAll(
    /^import\s+(\w+)\s+from\s+["'][^"']*\/([a-z0-9-]+\.(?:jpg|jpeg|png))["']/gim,
  )) imports.set(m[1], m[2]);

  const raw = new Map();
  for (const m of text.matchAll(/(?:export\s+)?const\s+([A-Za-z_]\w*)\s*=\s*\{([^{}]*)\}/g)) {
    raw.set(m[1], m[2]);
  }
  const resolve = (name, seen = new Set()) => {
    if (seen.has(name) || !raw.has(name)) return null;
    const body = raw.get(name);
    const l = /license:\s*["']([\w-]+)["']/.exec(body)?.[1];
    if (l) return l;
    seen.add(name);
    for (const sp of body.matchAll(/\.\.\.([A-Za-z_]\w*)/g)) {
      const r = resolve(sp[1], seen);
      if (r) return r;
    }
    return null;
  };

  for (const tag of text.match(/<Figure\b[\s\S]*?\/>/g) ?? []) {
    const v = /src=\{(\w+)\}/.exec(tag)?.[1];
    const file = v && imports.get(v);
    if (!file) continue;
    let declared = /license=["']([\w-]+)["']/.exec(tag)?.[1] ?? null;
    if (!declared) {
      for (const sp of tag.matchAll(/\{\.\.\.([A-Za-z_]\w*)\}/g)) {
        declared = resolve(sp[1]);
        if (declared) break;
      }
    }
    if (declared) out.push({ where: 'figure', file, declared });
  }
  return out;
}

/**
 * 기사 한 편을 대장과 대조한다.
 * @returns {{fail: string[], warn: string[]}}
 */
export function checkKoglLicences(text, slug, registry) {
  const fail = [];
  const warn = [];
  if (!registry?.size) return { fail, warn };

  for (const { where, file, declared } of declaredLicences(text)) {
    const actual = registry.get(file);
    if (!actual || actual === declared) continue;

    const line =
      `${slug} (${where}): ${file} 를 ${declared} 로 선언했으나 ` +
      `data/place-images.json 은 ${actual} 입니다.`;

    if (NO_MODIFY.has(actual) && !NO_MODIFY.has(declared)) {
      fail.push(
        `${line}\n` +
        `      ${actual} 는 **변경금지**입니다. ${declared} 로 적으면 Figure 가 Astro <Image> 를 태워 ` +
        '리사이즈·WebP 변환을 합니다 — 그것이 곧 변경이고 licence 위반입니다.\n' +
        '      대장의 값으로 고치십시오. 대장이 틀렸다고 판단되면 원본 페이지를 열어 확인한 뒤 대장을 고치십시오.',
      );
    } else {
      warn.push(`${line}  ← 대장보다 엄격합니다 (최적화만 못 합니다. 위반은 아닙니다)`);
    }
  }
  return { fail, warn };
}
