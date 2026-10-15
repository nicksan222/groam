import { env } from '@groam/env/playwright';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  expect: { timeout: env.isCI ? 45_000 : 10_000 },
  // Every worker signs in as its own account and group (see @groam/app-actions/playwright/test),
  // so tests share no data and can run in any order.
  fullyParallel: true,
  outputDir: 'test-results',
  reporter: env.isCI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  retries: env.isCI ? 2 : 0,
  testDir: './e2e',
  timeout: env.isCI ? 180_000 : 30_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: env.baseUrl,
    screenshot: 'only-on-failure',
    trace: env.isCI ? 'on-first-retry' : 'retain-on-failure'
  },
  workers: env.isCI ? 2 : 4
});
