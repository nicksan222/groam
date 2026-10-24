import { expect, test } from 'vite-plus/test';
import { calendarActivityDraft, timeBlockFor } from './calendar-slot';

const slot = {
  startDate: '2026-09-15',
  endDate: '2026-09-15',
  startTime: '09:00',
  endTime: '10:00'
};

test('counts a slot’s trip days from the calendar’s Day 1', () => {
  expect(calendarActivityDraft('2026-09-14', slot)).toEqual({
    day: 2,
    endDay: 2,
    startTime: '09:00',
    endTime: '10:00',
    timeBlock: 'morning'
  });
  expect(
    calendarActivityDraft('2026-09-14', {
      ...slot,
      endDate: '2026-09-17',
      startTime: null,
      endTime: null
    })
  ).toMatchObject({ day: 2, endDay: 4, timeBlock: 'full_day' });
});

test('a slot running to midnight stays on its day, open-ended', () => {
  expect(
    calendarActivityDraft('2026-09-14', {
      ...slot,
      endDate: '2026-09-16',
      startTime: '23:00',
      endTime: '00:00'
    })
  ).toMatchObject({ day: 2, endDay: 2, startTime: '23:00', endTime: null });
});

test('names the part of the day a time starts in', () => {
  expect(timeBlockFor(null)).toBe('full_day');
  expect(timeBlockFor('08:30')).toBe('morning');
  expect(timeBlockFor('13:00')).toBe('afternoon');
  expect(timeBlockFor('19:15')).toBe('evening');
});
