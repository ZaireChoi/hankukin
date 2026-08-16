/**
 * 번역본의 파일 경로에서 **공개 주소용 slug** 를 뽑는다.
 *
 * 왜 필요한가 (2026-08-17, 첫 번역본을 쓰기 직전에 발견).
 *
 *   콘텐츠 컬렉션의 id 는 파일 경로에서 나온다.
 *     src/content/decode/korea-esim-no-phone-number.mdx      → 'korea-esim-no-phone-number'
 *     src/content/decode/ja/korea-esim-no-phone-number.mdx   → 'ja/korea-esim-no-phone-number'
 *
 *   그런데 URL 은 **언어와 무관하게 같은 slug 여야 한다.**
 *     /en/decode/korea-esim-no-phone-number/
 *     /ja/decode/korea-esim-no-phone-number/
 *   그래야 hreflang 이 성립하고, 독자가 주소만 바꿔도 같은 글로 간다.
 *
 *   그냥 두면 /ja/decode/**ja/**korea-esim-no-phone-number/ 가 된다.
 *   언어가 주소에 두 번 나오고, hreflang 은 서로를 못 가리킨다.
 *
 * 그래서 파일은 언어 폴더에 두되 **주소에서는 그 폴더를 뺀다.**
 *
 * 폴더로 나누는 이유 (파일명 접미사가 아니라):
 *   같은 slug 의 4개 언어가 나란히 있으면 파일 목록이 언어별로 섞인다.
 *   폴더로 나누면 「일본어가 몇 편인가」가 ls 한 번에 보인다.
 *   그리고 영어 원문은 폴더 없이 그대로 둔다 — 원본은 기본값이지 하나의 언어가 아니다.
 */
import { LOCALES, PLANNED_LOCALES } from './brand.mjs';

/** 언어 폴더로 인정할 이름. 임의의 폴더를 벗겨내면 조용히 주소가 어긋난다. */
const LOCALE_DIRS = new Set([...LOCALES, ...PLANNED_LOCALES]);

export function publicSlug(id) {
  const i = id.indexOf('/');
  if (i === -1) return id;
  const head = id.slice(0, i);
  return LOCALE_DIRS.has(head) ? id.slice(i + 1) : id;
}
