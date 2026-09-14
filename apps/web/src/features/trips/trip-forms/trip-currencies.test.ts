import { expect, test } from 'vitest';
import {
  DEFAULT_TRIP_CURRENCY,
  tripCurrency,
  tripCurrencyLabel
} from '@/features/trips/trip-forms/trip-currencies';

test('recognizes the shared backend currency enum', () => {
  expect(DEFAULT_TRIP_CURRENCY).toBe('USD');
  expect(tripCurrency('USD')).toBe('USD');
  expect(tripCurrency('usd')).toBeUndefined();
  expect(tripCurrency('XXX')).toBeUndefined();
});

test('labels currencies with their localized names', () => {
  expect(tripCurrencyLabel('USD')).toMatch(/^USD · /u);
  expect(tripCurrencyLabel('EUR')).toMatch(/^EUR · /u);
});
