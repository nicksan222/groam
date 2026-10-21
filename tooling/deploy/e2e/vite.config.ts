import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';

// Live checks against the environment selected by GROAM_ENVIRONMENT, after its release.
export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: {
    include: ['e2e/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    retry: 1
  }
});
