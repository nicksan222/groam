import { env } from '@groam/env/landing';
import type { APIRoute } from 'astro';
import { features, featurePath } from '@/content/site';

// Every public page, as absolute URLs from LANDING_SITE_URL.
const paths = [
  '/',
  '/features/',
  ...features.map((feature) => featurePath(feature.slug)),
  '/pricing/',
  '/privacy/',
  '/terms/'
];

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = paths.map(
    (path) =>
      `  <url><loc>${new URL(path, env.siteUrl).href}</loc><lastmod>${lastmod}</lastmod></url>`
  );
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
