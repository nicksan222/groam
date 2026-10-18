import { describe, expect, test } from 'vite-plus/test';
import { coveredCount, packingCoverage } from './packing-coverage';

describe('packingCoverage', () => {
  test.each([
    [{ brought: 1, quantity: 3 }, 'missing', 2, 'Need 2 more'],
    [{ brought: 3, quantity: 3 }, 'covered', 0, 'Covered'],
    [{ brought: 4, quantity: 3 }, 'over', 1, '1 spare']
  ])('reads %o as %s', (item, state, amount, label) => {
    expect(packingCoverage(item)).toEqual({ amount, label, state });
  });

  test('counts covered items', () => {
    expect(
      coveredCount([
        { brought: 3, quantity: 3 },
        { brought: 0, quantity: 1 },
        { brought: 2, quantity: 1 }
      ])
    ).toBe(2);
  });
});
