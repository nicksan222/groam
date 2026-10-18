import { env } from '@groam/env/landing';
import type { APIRoute } from 'astro';
import { publicPaths, locales, localizedPath } from '@/i18n/locale';

// Every public page, as absolute URLs from LANDING_SITE_URL.
export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = publicPaths.flatMap((path) =>
    locales.map((locale) => {
      const href = new URL(localizedPath(path, locale), env.siteUrl).href;
      const alternates = [...locales, 'x-default' as const]
        .map(
          (language) =>
            `<xhtml:link rel="alternate" hreflang="${language}" href="${new URL(localizedPath(path, language === 'x-default' ? 'en' : language), env.siteUrl).href}"/>`
        )
        .join('');
      return `  <url><loc>${href}</loc><lastmod>${lastmod}</lastmod>${alternates}</url>`;
    })
  );
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
