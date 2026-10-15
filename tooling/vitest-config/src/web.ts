import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';
import type { BrowserConfigOptions, BrowserInstanceOption } from 'vite-plus/test/node';
import { resolveRepoRoot } from './repo-root.ts';
import { setupFiles } from './setup-files.ts';

export type WebVitestOptions = {
  /** Browser mode: one Chromium instance per setup (Vitest's "multiple setups"). */
  browser?: Pick<BrowserConfigOptions, 'commands'> & {
    instances: Omit<BrowserInstanceOption, 'browser'>[];
    /** A fixed port, for setups whose origin the backend must trust. */
    port?: number;
  };
  projectRoot?: string;
};

export function createWebVitestConfig(appRoot: string, options: WebVitestOptions = {}) {
  const browser = options.browser;
  const browserTests = browser?.instances.flatMap((instance) => instance.include ?? []) ?? [];
  return defineConfig({
    // Match apps/web/vite.config.ts so VITE_* vars resolve from the monorepo root.
    envDir: options.projectRoot ?? resolveRepoRoot(appRoot),
    // Scan browser tests up front so Vite never re-optimizes dependencies, and reloads, mid-run.
    optimizeDeps: { entries: browserTests },
    plugins: [react(), tailwindcss()],
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
      projects: [
        {
          extends: true,
          test: {
            environment: 'node',
            exclude: browserTests,
            include: ['src/**/*.test.{ts,tsx}'],
            name: 'unit'
          }
        },
        ...(browser
          ? [
              {
                extends: true,
                test: {
                  ...(browser.port ? { api: { port: browser.port, strictPort: true } } : {}),
                  browser: {
                    commands: browser.commands,
                    enabled: true,
                    headless: true,
                    instances: browser.instances.map((instance): BrowserInstanceOption => ({
                      browser: 'chromium',
                      expect: { poll: { timeout: 5_000 } },
                      testTimeout: 15_000,
                      ...instance
                    })),
                    // Real clicks wait for actionable targets; fail fast instead of at the test timeout.
                    provider: playwright({ actionTimeout: 5_000 }),
                    viewport: { height: 800, width: 1280 }
                  },
                  include: browserTests
                }
              }
            ]
          : [])
      ],
      restoreMocks: true,
      setupFiles: [setupFiles.consoleGuard]
    }
  });
}
