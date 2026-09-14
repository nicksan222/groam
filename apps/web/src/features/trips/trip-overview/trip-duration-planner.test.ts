import { describe, expect, test } from 'vitest';
import {
  addTripDays,
  tripDateRangeDays,
  tripDurationRangeState
} from '@/features/trips/trip-duration';

describe('trip duration range', () => {
  test('counts inclusive calendar days and rejects incomplete ranges', () => {
    expect(tripDateRangeDays('2026-08-01', '2026-08-01')).toBe(1);
    expect(tripDateRangeDays('2026-08-01', '2026-08-10')).toBe(10);
    expect(tripDateRangeDays('', '2026-08-10')).toBeNaN();
    expect(addTripDays('2026-08-01', 6)).toBe('2026-08-07');
  });

  test('requires a complete in-bounds range before saving', () => {
    expect(
      tripDurationRangeState({
        from: '2026-08-01',
        minimumDays: 3,
        startDate: null,
        to: '2026-08-02',
        totalDays: null
      })
    ).toMatchObject({ hasChanged: false, isValid: false });
    expect(
      tripDurationRangeState({
        from: '2026-08-01',
        minimumDays: 3,
        startDate: '2026-08-01',
        to: '2026-08-07',
        totalDays: 7
      })
    ).toMatchObject({ days: 7, hasChanged: false, isValid: true });
    expect(
      tripDurationRangeState({
        from: '2026-08-02',
        minimumDays: 3,
        startDate: '2026-08-01',
        to: '2026-08-08',
        totalDays: 7
      })
    ).toMatchObject({ days: 7, hasChanged: true, isValid: true });
  });
});
