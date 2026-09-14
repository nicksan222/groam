import { expect, test } from 'vitest';
import { tripDurationInput } from './trip-duration-input';

test('preserves planning preferences while changing the concrete trip length', () => {
  expect(tripDurationInput({ idealDurationDays: 9, minimumDurationDays: 6 }, 10)).toEqual({
    idealDays: 9,
    minimumDays: 6,
    totalDays: 10
  });
});

test('omits an entirely unknown duration and supports partial preferences', () => {
  expect(tripDurationInput({ idealDurationDays: null, minimumDurationDays: null }, undefined)).toBe(
    undefined
  );
  expect(tripDurationInput({ idealDurationDays: 7, minimumDurationDays: null }, undefined)).toEqual(
    {
      idealDays: 7
    }
  );
});
