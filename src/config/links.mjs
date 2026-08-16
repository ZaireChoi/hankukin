/**
 * 언어별 링크 만들기 — 한 곳에서만 정한다.
 *
 * 2026-08-17. 일본어를 켜고 나서 내부 링크가 **27건** 깨졌다.
 * 전부 같은 원인 둘이었다:
 *
 *   ① 정책·안내 페이지는 영어판만 있는데 `/${lang}/about/` 로 링크했다
 *   ② 번역본의 주소를 만들 때 언어 폴더를 안 벗겼다
 *      → /ja/hangul/**ja/**korean-restaurant-signs-last-word/
 *
 * 두 규칙 다 여러 컴포넌트에 흩어져 있어서, 하나를 고치면 옆이 남았다.
 * **오늘 하루에 여섯 번 반복한 바로 그 모양이다.** 그래서 여기 모은다.
 */
import { DEFAULT_LOCALE } from './brand.mjs';
import { publicSlug } from './slug.mjs';

/**
 * 아직 번역되지 않은 정책·안내 페이지.
 * 번역이 생기면 여기서 지운다 — 그러면 링크가 저절로 그 언어를 가리킨다.
 */
export const ENGLISH_ONLY_PAGES = new Set([
  'about', 'author', 'editorial-policy', 'ledger',
  'affiliate-disclosure', 'privacy', 'contact',
  'arrival', 'stuck',
]);

/** 정책·안내 페이지 주소. 번역이 없으면 영어판으로 보낸다. */
export function pageHref(lang, path) {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const useLang = ENGLISH_ONLY_PAGES.has(clean) ? DEFAULT_LOCALE : lang;
  return `/${useLang}/${clean}/`;
}

/** 그 링크가 다른 언어로 넘어가는가 — 화면에 「（英語）」를 붙일지 결정한다. */
export function isForeign(lang, path) {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return lang !== DEFAULT_LOCALE && ENGLISH_ONLY_PAGES.has(clean);
}

/** 기사 주소. 언어 폴더를 벗긴 slug 를 쓴다. */
export function articleHref(lang, section, id) {
  return `/${lang}/${section}/${publicSlug(id)}/`;
}
