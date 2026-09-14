import { expect, test } from 'vitest';
import { formatDayTimeRange, formatTripDay } from './trip-local-date-time';

test('formats itinerary-relative days without requiring a calendar start date', () => {
  expect(formatTripDay(null, 3)).toBe('Day 3');
  expect(formatDayTimeRange(null, 2, '08:30', 4, null)).toContain('Day 2');
  expect(formatDayTimeRange(null, 2, '08:30', 4, null)).toContain('Day 4');
});

test('omits an exact timing summary when no start time exists', () => {
  expect(formatDayTimeRange('2027-06-01', 1, null, 2, null)).toBeNull();
});
