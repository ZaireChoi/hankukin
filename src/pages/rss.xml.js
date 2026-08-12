import { getCollection } from 'astro:content';
import { BRAND, DEFAULT_LOCALE } from '../config/brand.mjs';

export async function GET(context) {
  const scenes = (await getCollection('scenes', (e) => !e.data.draft))
    .sort((a, b) => b.data.publishedAt - a.data.publishedAt);
  const site = context.site?.href ?? `https://${BRAND.canonicalHost}/`;
  const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
  const items = scenes.map((s) => `    <item>
      <title>${esc(s.data.title)}</title>
      <link>${site}${s.data.lang}/scenes/${s.id}/</link>
      <guid>${site}${s.data.lang}/scenes/${s.id}/</guid>
      <description>${esc(s.data.summary)}</description>
      <pubDate>${s.data.publishedAt.toUTCString()}</pubDate>
    </item>`).join('\n');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(BRAND.name)}</title>
    <link>${site}${DEFAULT_LOCALE}/</link>
    <description>${esc(BRAND.defaultMetaDescription)}</description>
    <language>en</language>
${items}
  </channel>
</rss>`, { headers: { 'Content-Type': 'application/xml' } });
}
