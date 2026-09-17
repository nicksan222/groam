import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { resolveRepoRoot } from './repo-root.ts';

export function createWebVitestConfig(appRoot: string, options: { projectRoot?: string } = {}) {
  return defineConfig({
    // Match apps/web/vite.config.ts so VITE_* vars resolve from the monorepo root.
    envDir: options.projectRoot ?? resolveRepoRoot(appRoot),
    resolve: {
      alias: { '@': path.resolve(appRoot, 'src') },
      dedupe: ['react', 'react-dom']
    },
    test: {
      coverage: {
        exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        include: ['src/features/**/hooks/use-*.ts', 'src/features/**/hooks/use-*.tsx'],
        provider: 'istanbul',
        reportsDirectory: 'coverage/hooks',
        reporter: ['text', 'json', 'json-summary'],
        thresholds: {
          branches: 70,
          functions: 75,
          lines: 80,
          perFile: true,
          statements: 80
        }
      },
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true
    }
  });
}
