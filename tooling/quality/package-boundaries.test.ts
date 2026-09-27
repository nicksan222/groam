import { describe, expect, test } from 'bun:test';
import { invalidPackageDependencies } from './package-boundaries';

describe('invalidPackageDependencies', () => {
  test('allows the documented AI dependency directions', () => {
    expect(
      invalidPackageDependencies({
        dependencies: { '@groam/brand': 'workspace:*' },
        name: '@groam/ui'
      })
    ).toEqual([]);
    expect(
      invalidPackageDependencies({
        dependencies: { '@groam/ai': 'workspace:*' },
        name: '@groam/backend'
      })
    ).toEqual([]);
    expect(
      invalidPackageDependencies({
        dependencies: { '@groam/ui': 'workspace:*' },
        name: '@groam/ai'
      })
    ).toEqual([]);
  });

  test('rejects unlisted edges and unknown packages', () => {
    expect(
      invalidPackageDependencies({
        dependencies: { '@groam/ui': 'workspace:*' },
        name: '@groam/backend'
      })
    ).toEqual(['@groam/backend -> @groam/ui']);
    expect(
      invalidPackageDependencies({
        dependencies: { '@groam/backend': 'workspace:*' },
        name: '@groam/ai'
      })
    ).toEqual(['@groam/ai -> @groam/backend']);
    expect(invalidPackageDependencies({ name: '@groam/future' })).toEqual([
      '@groam/future is missing from the package boundary map'
    ]);
  });

  test('does not treat test tooling as a runtime package dependency', () => {
    expect(
      invalidPackageDependencies({
        devDependencies: { '@groam/app-actions': 'workspace:*' },
        name: '@groam/ui'
      })
    ).toEqual([]);
  });
});
