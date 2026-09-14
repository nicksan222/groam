import { describe, expect, test } from 'vitest';
import { mapWithConcurrency } from './map-with-concurrency';

describe('mapWithConcurrency', () => {
  test('preserves input order while bounding active operations', async () => {
    let active = 0;
    let maximumActive = 0;
    const result = await mapWithConcurrency([4, 3, 2, 1], 2, async (value) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, value));
      active -= 1;
      return value * 2;
    });

    expect(result).toEqual([8, 6, 4, 2]);
    expect(maximumActive).toBe(2);
  });

  test('rejects invalid concurrency', async () => {
    await expect(mapWithConcurrency([1], 0, async (value) => value)).rejects.toThrow(
      'Concurrency must be a positive integer'
    );
  });
});
