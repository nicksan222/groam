import { describe, expect, test } from 'vitest';
import { componentResetTargets } from './local-reset-targets';

describe('local reset targets', () => {
  test('includes every Better Auth and geospatial table', () => {
    expect(componentResetTargets.every(({ component }) => component.length > 0)).toBe(true);
    expect(new Set(componentResetTargets.map(({ component }) => component))).toEqual(
      new Set(['betterAuth', 'geospatial'])
    );
    expect(componentResetTargets).toHaveLength(14);
  });
});
