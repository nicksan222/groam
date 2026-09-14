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
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true
    }
  });
}
