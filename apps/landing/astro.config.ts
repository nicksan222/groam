import { env } from '@groam/env/landing';
import { defineConfig } from 'astro/config';

// Static marketing site. The product itself lives in apps/web.
export default defineConfig({
  output: 'static',
  site: env.siteUrl,
  trailingSlash: 'always',
  server: { port: 4321 }
});
