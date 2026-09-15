import { expect, test } from 'vitest';
import { costsMatch, plannedCostAmount, tripCostSplit } from './costs';

test('treats missing splits as a total group cost', () => {
  expect(tripCostSplit(undefined)).toBe('total');
  expect(tripCostSplit('per_person')).toBe('per_person');
  expect(costsMatch({ amount: 40 }, { amount: 40, split: 'total' })).toBe(true);
  expect(costsMatch({ amount: 40, split: 'per_person' }, { amount: 40 })).toBe(false);
});

test('multiplies per-person amounts by traveler count for the planned total', () => {
  expect(plannedCostAmount({ amount: 50 }, 3)).toBe(50);
  expect(plannedCostAmount({ amount: 50, split: 'total' }, 3)).toBe(50);
  expect(plannedCostAmount({ amount: 50, split: 'per_person' }, 3)).toBe(150);
  expect(plannedCostAmount({ amount: 50, split: 'per_person' }, 0)).toBe(50);
  expect(plannedCostAmount(undefined, 4)).toBe(0);
});
