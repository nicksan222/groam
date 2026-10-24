import { defineConfig } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';
import { siteCommands } from './e2e/commands';

// Browser tests load the built site (`astro build` writes dist/) as static files from the
// test server, inside a same-origin frame, and drive it like a visitor would.
export default defineConfig({
  publicDir: 'dist',
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  test: {
    browser: {
      commands: siteCommands,
      enabled: true,
      headless: true,
      instances: [{ browser: 'chromium', name: 'site' }],
      provider: playwright({ actionTimeout: 5_000, contextOptions: { locale: 'en-US' } }),
      viewport: { height: 900, width: 1440 }
    },
    expect: { poll: { timeout: 5_000 } },
    include: ['e2e/**/*.test.ts'],
    testTimeout: 20_000
  }
});
