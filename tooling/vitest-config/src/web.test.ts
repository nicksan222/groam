import { describe, expect, test } from 'bun:test';
import { createWebVitestConfig } from './web';

describe('createWebVitestConfig', () => {
  test('uses an explicit projectRoot for envDir', () => {
    const config = createWebVitestConfig('/apps/web', { projectRoot: '/repo' });
    expect(config.envDir).toBe('/repo');
  });
});
