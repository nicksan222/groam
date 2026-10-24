import path from 'node:path';
import { journeyCommands } from '@groam/app-actions/vitest/commands';
import { env as testEnv } from '@groam/env/vitest';
import { createWebVitestConfig } from '@groam/vitest-config/web';
import tailwindcss from '@tailwindcss/vite';
import { voidReact } from '@void/react/plugin';
import { defineConfig, lazyPlugins, mergeConfig } from 'vite-plus';
import { voidPlugin } from 'void';
import { voidPagesManifest } from './src/journeys/void-pages-manifest';

const testConfig = mergeConfig(
  { plugins: [voidPagesManifest(import.meta.dirname)] },
  createWebVitestConfig(import.meta.dirname, {
    browser: {
      commands: journeyCommands,
      instances: [
        {
          include: [
            'src/**/*.test.tsx',
            'src/features/**/hooks/*.test.ts',
            // A .ts test that needs a DOM (it clicks a download anchor), which the Node unit project lacks.
            'src/lib/download-text-file.test.ts'
          ],
          name: 'views',
          setupFiles: ['./src/views-setup.ts']
        },
        {
          // Full-app journeys against one live backend wait longer than mounted views, and run
          // a few files at a time so that backend keeps up. CI runs one journey at a time:
          // Chromium, Vite compilation and the local backend share the runner, and concurrent
          // full-app subscriptions can exhaust the backend's strict one-second query budget.
          expect: { poll: { timeout: 30_000 } },
          include: ['e2e/**/*.test.tsx'],
          maxWorkers: testEnv.isCI ? 1 : 4,
          name: 'journeys',
          setupFiles: ['./src/journeys-setup.ts'],
          testTimeout: testEnv.isCI ? 120_000 : 60_000
        }
      ],
      // Local Better Auth trusts this origin (packages/backend/convex/modules/auth/origins.ts).
      port: 5174
    }
  })
);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const app = {
    // maplibre-gl is a single ~1 MB module in its own chunk; anything else this large should warn.
    build: { chunkSizeWarningLimit: 1_100 },
    envDir: '../..',
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
      dedupe: ['react', 'react-dom', 'recharts']
    }
  };
  // Tests skip Void's pages and Worker; the test config brings the React and Tailwind plugins.
  return mode === 'test'
    ? mergeConfig(app, testConfig)
    : {
        ...app,
        // Dependencies that Vite's startup scan misses are found only when a page first imports them,
        // which re-optimizes and reloads the whole app mid-session. packages/ui is a linked source
        // package, so its dependencies are listed through it (a bare specifier resolves from here).
        optimizeDeps: {
          include: ['@groam/ui > @tanstack/react-table', '@groam/ui > @tanstack/table-core']
        },
        server: {
          watch: {
            // Vite already skips node_modules, .git, test-results and its cache; workspace packages
            // are watched through their real paths (packages/*), not their node_modules symlinks.
            // These generated directories sit under this root and change on every build or test run.
            ignored: ['**/dist/**', '**/coverage/**', '**/.vitest/**']
          },
          // Transform the shell every page renders (it imports index.css) at startup, so the first
          // request does not compile it and its whole component graph.
          warmup: { clientFiles: ['./src/app-layout.tsx'] }
        },
        plugins: lazyPlugins(() => [
          voidPlugin(),
          voidReact({ viewTransitions: true }),
          tailwindcss()
        ])
      };
});
