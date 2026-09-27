import { env } from '@groam/env/playwright';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  expect: { timeout: env.isCI ? 45_000 : 10_000 },
  fullyParallel: false,
  outputDir: 'test-results',
  reporter: env.isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  retries: env.isCI ? 2 : 0,
  testDir: './e2e',
  timeout: env.isCI ? 180_000 : 30_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: env.baseUrl,
    screenshot: 'only-on-failure',
    trace: env.isCI ? 'on-first-retry' : 'retain-on-failure'
  },
  // CI runners have two cores; run separate spec files concurrently.
  workers: env.isCI ? 2 : 1
});
