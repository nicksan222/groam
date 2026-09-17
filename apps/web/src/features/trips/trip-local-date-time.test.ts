import { expect, test } from 'vitest';
import { formatDayTimeRange, formatTripDay } from './trip-local-date-time';

test('formats itinerary-relative days without requiring a calendar start date', () => {
  expect(formatTripDay(null, 3)).toBe('Day 3');
  expect(
    formatDayTimeRange({
      startDate: null,
      startDay: 2,
      startTime: '08:30',
      endDay: 4,
      endTime: null
    })
  ).toContain('Day 2');
  expect(
    formatDayTimeRange({
      startDate: null,
      startDay: 2,
      startTime: '08:30',
      endDay: 4,
      endTime: null
    })
  ).toContain('Day 4');
});

test('omits an exact timing summary when no start time exists', () => {
  expect(
    formatDayTimeRange({
      startDate: '2027-06-01',
      startDay: 1,
      startTime: null,
      endDay: 2,
      endTime: null
    })
  ).toBeNull();
});
