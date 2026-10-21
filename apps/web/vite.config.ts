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
          // a few files at a time so that backend keeps up. A shared 4-core CI runner takes two
          // at a time, each about twice as slow.
          expect: { poll: { timeout: 30_000 } },
          include: ['e2e/**/*.test.tsx'],
          maxWorkers: testEnv.isCI ? 2 : 4,
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
        plugins: lazyPlugins(() => [
          voidPlugin(),
          voidReact({ viewTransitions: true }),
          tailwindcss()
        ])
      };
});
