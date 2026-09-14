import { expect, test } from 'vitest';
import {
  formatTripLineCost,
  tripCostAmountLabel,
  tripCostInput,
  tripCostSplit
} from '@/features/trips/trip-forms/trip-cost';

test('defaults unknown splits to a total group cost', () => {
  expect(tripCostSplit(undefined)).toBe('total');
  expect(tripCostSplit('per_person')).toBe('per_person');
  expect(tripCostInput('', 'per_person')).toBeUndefined();
  expect(tripCostInput('40', 'per_person')).toEqual({ amount: 40, split: 'per_person' });
});

test('labels entered costs as total or per person', () => {
  expect(formatTripLineCost(50, 'EUR', 'total')).toMatch(/total$/u);
  expect(formatTripLineCost(50, 'EUR', 'per_person')).toMatch(/\/ person$/u);
  expect(tripCostAmountLabel('Estimated cost', 'total', 'EUR')).toBe(
    'Estimated cost for the group (EUR)'
  );
  expect(tripCostAmountLabel('Estimated cost', 'per_person')).toBe('Estimated cost per person');
});
