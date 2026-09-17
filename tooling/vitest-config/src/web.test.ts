import { describe, expect, test } from 'bun:test';
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
});
