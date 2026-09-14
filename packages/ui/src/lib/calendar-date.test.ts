import { expect, test } from 'vitest';
import { dateFromString, stringFromDate } from './calendar-date';

test('parses a YYYY-MM-DD calendar date as local midnight', () => {
  const date = dateFromString('2026-08-23');
  expect(date?.getFullYear()).toBe(2026);
  expect(date?.getMonth()).toBe(7);
  expect(date?.getDate()).toBe(23);
});

test('rejects incomplete calendar dates', () => {
  expect(dateFromString('2026-08')).toBeUndefined();
  expect(dateFromString('')).toBeUndefined();
});

test('formats a local date as YYYY-MM-DD', () => {
  expect(stringFromDate(new Date(2026, 7, 23))).toBe('2026-08-23');
});
