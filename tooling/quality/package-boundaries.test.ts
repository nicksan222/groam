import { describe, expect, test } from 'bun:test';
import { invalidPackageDependencies } from './package-boundaries';

describe('invalidPackageDependencies', () => {
  test('allows the documented AI dependency direction', () => {
    expect(
      invalidPackageDependencies({
        dependencies: {
          '@groam/ai-contracts': 'workspace:*',
          '@groam/backend': 'workspace:*'
        },
        name: '@groam/ui'
      })
    ).toEqual([]);
  });

  test('rejects runtime cycles and unknown packages', () => {
    expect(
      invalidPackageDependencies({
        dependencies: { '@groam/ai': 'workspace:*' },
        name: '@groam/backend'
      })
    ).toEqual(['@groam/backend -> @groam/ai']);
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
