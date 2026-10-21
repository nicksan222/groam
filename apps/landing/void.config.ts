import { environments } from '@groam/deploy/environments';
import { env } from '@groam/env/void';
import { defineConfig } from 'void/config';

const { landing } = environments[env.environment];

// The landing site's own Void deployment: Astro's static output, served from Cloudflare's edge.
// The web app deploys separately from apps/web.
export default defineConfig({
  cloudflare: {
    name: landing.worker,
    routes: [{ custom_domain: true, pattern: landing.host }],
    preview_urls: false,
    workers_dev: true
  },
  inference: { appType: 'static', build: 'astro build', outputDir: 'dist' }
});
