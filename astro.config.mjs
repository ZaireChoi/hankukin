import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import noSharedImages from './src/integrations/no-shared-images.mjs';
import contentQuality from './src/integrations/content-quality.mjs';
import { BRAND, LOCALES, DEFAULT_LOCALE, NOINDEX_PATHS } from './src/config/brand.mjs';

export default defineConfig({
  site: `https://${BRAND.canonicalHost}`,
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...LOCALES],
    routing: {
      prefixDefaultLocale: true,
      // Astro 가 루트 리디렉션 HTML 을 자동 생성하지 않게 한다.
      // 자동 생성물은 2초 지연 meta refresh 와 "Redirecting from / to /en/" 문구를 포함해
      // 방문자에게 그대로 노출됐다. 루트는 public/_redirects 의 엣지 302 로 처리하고,
      // src/pages/index.astro 는 그것이 없는 환경을 위한 무음 폴백이다.
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    noSharedImages(),
    contentQuality(),
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
