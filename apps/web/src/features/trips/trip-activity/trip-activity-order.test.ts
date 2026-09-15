import { expect, test } from 'vitest';
import {
  activityDaysNeedReordering,
  activityOrderIssue,
  activityReorderClearsTravel
} from '@/features/trips/trip-activity/trip-activity-order';

const activity = (dayNumber: number, endDayNumber = dayNumber) => ({
  dayNumber,
  endDayNumber
});

test('detects activity start days that are out of order', () => {
  expect(activityDaysNeedReordering([activity(2), activity(3), activity(1)])).toBe(true);
  expect(activityDaysNeedReordering([activity(1), activity(2), activity(2)])).toBe(false);
});

test('distinguishes out-of-order plans from overlapping ranges', () => {
  expect(activityOrderIssue(activity(3), activity(1))).toBe('out_of_order');
  expect(activityOrderIssue(activity(1, 3), activity(2))).toBe('overlap');
  expect(activityOrderIssue(activity(1), activity(1))).toBeNull();
  expect(activityOrderIssue(activity(1, 2), activity(2))).toBeNull();
});

test('detects travel that will no longer connect neighbors after reordering', () => {
  const plan = [
    { ...activity(1), id: 'one', transferToNext: { toActivityId: 'three' } },
    { ...activity(3), id: 'three', transferToNext: null },
    { ...activity(2), id: 'two', transferToNext: null }
  ];
  expect(activityReorderClearsTravel(plan)).toBe(true);
  expect(
    activityReorderClearsTravel([
      { ...plan[0], transferToNext: null },
      { ...plan[1], transferToNext: null },
      { ...plan[2], transferToNext: { toActivityId: 'three' } }
    ])
  ).toBe(false);
});
