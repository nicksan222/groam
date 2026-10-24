import { env } from '@groam/env/landing';
import { defineConfig } from 'astro/config';

// Static marketing site. The product itself lives in apps/web.
export default defineConfig({
  output: 'static',
  site: env.siteUrl,
  trailingSlash: 'always',
  i18n: { defaultLocale: 'en', locales: ['en', 'it'], routing: { prefixDefaultLocale: false } },
  server: { port: 4321 }
});
