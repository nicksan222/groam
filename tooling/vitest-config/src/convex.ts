import { env } from '@groam/env/vitest';
import { defineConfig } from 'vitest/config';

export const convexVitestConfig = defineConfig({
  test: {
    // convex-test spins up edge-runtime VMs; cap workers to avoid timeout flakes under load.
    maxWorkers: env.isCI ? 2 : 4,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      exclude: ['convex/**/*.test.ts', 'convex/**/schema.ts', 'convex/**/view.ts'],
      include: ['convex/modules/**/*.ts', 'convex/routes/**/*.ts'],
      provider: 'istanbul',
      reporter: ['text', 'json', 'json-summary'],
      thresholds: {
        branches: 85,
        functions: 97,
        lines: 95,
        statements: 93
      }
    },
    environment: 'edge-runtime',
    include: ['convex/**/*.test.ts']
  }
});
