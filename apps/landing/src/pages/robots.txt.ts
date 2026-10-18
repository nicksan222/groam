import { env } from '@groam/env/landing';
import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
  new Response(
    `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', env.siteUrl).href}\n`,
    {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    }
  );
