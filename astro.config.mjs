import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { BRAND, LOCALES, DEFAULT_LOCALE, NOINDEX_PATHS } from './src/config/brand.mjs';

export default defineConfig({
  site: `https://${BRAND.canonicalHost}`,
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...LOCALES],
    routing: { prefixDefaultLocale: true },
  },
  integrations: [
    mdx(),
    sitemap({
      i18n: { defaultLocale: DEFAULT_LOCALE, locales: Object.fromEntries(LOCALES.map((l) => [l, l])) },
      /**
       * noindex 페이지와 루트 리디렉션은 사이트맵에서 제외한다.
       * sitemap 에 넣으면서 noindex 를 거는 것은 검색엔진에 모순된 신호를 보낸다.
       * NOINDEX_PATHS 의 페이지가 실제로 발행되면 이 배열에서 빼고 페이지의 noindex 도 함께 제거할 것.
       */
      filter: (page) => {
        const u = new URL(page);
        if (u.pathname === '/') return false;
        return !NOINDEX_PATHS.some((seg) => u.pathname === `/${DEFAULT_LOCALE}/${seg}/`);
      },
    }),
  ],
  build: { format: 'directory' },
});
