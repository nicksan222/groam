import { describe, expect, test } from 'vite-plus/test';
import { createWebVitestConfig } from './web';

describe('createWebVitestConfig', () => {
  test('uses an explicit projectRoot for envDir', () => {
    const config = createWebVitestConfig('/apps/web', { projectRoot: '/repo' });
    expect(config.envDir).toBe('/repo');
  });

  test('isolates focused hook coverage reports from general coverage runs', () => {
    const config = createWebVitestConfig('/apps/web', { projectRoot: '/repo' });
    expect(config.test?.coverage?.reportsDirectory).toBe('coverage/hooks');
    expect(config.test?.coverage?.thresholds?.perFile).toBe(true);
  });

  test('runs browser setups in Chromium and keeps their files out of the Node unit project', () => {
    const config = createWebVitestConfig('/apps/web', {
      browser: {
        instances: [
          { include: ['src/view.test.tsx'], name: 'views' },
          { include: ['e2e/**/*.test.tsx'], name: 'journeys', testTimeout: 60_000 }
        ],
        port: 5174
      },
      projectRoot: '/repo'
    });
    const [unit, browser] = config.test?.projects ?? [];
    const browserTests = ['src/view.test.tsx', 'e2e/**/*.test.tsx'];

    expect(config.optimizeDeps?.entries).toEqual(browserTests);
    expect(unit).toMatchObject({ test: { environment: 'node', exclude: browserTests } });
    expect(browser).toMatchObject({
      test: {
        api: { port: 5174, strictPort: true },
        browser: {
          instances: [
            { browser: 'chromium', name: 'views', testTimeout: 15_000 },
            { browser: 'chromium', name: 'journeys', testTimeout: 60_000 }
          ]
        },
        include: browserTests
      }
    });
  });
});
