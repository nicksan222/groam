import { defineConfig } from 'void/config';

// The landing site is its own Void project: Astro's static output on its own origin, separate
// from the web app in apps/web.
export default defineConfig({
  inference: { appType: 'static', build: 'astro build', outputDir: 'dist' }
});
