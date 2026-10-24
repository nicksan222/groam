import { describe, expect, test } from 'vite-plus/test';
import { compactAge } from './queue-age';

const now = 1_000_000_000_000;
const ago = (ms: number) => now - ms;
const hour = 3_600_000;

describe('compactAge', () => {
  test.each([
    [10_000, 'now'],
    [5 * 60_000, '5m'],
    [5 * hour, '5h'],
    [2 * 24 * hour, '2d'],
    [10 * 24 * hour, '1w'],
    [90 * 24 * hour, '3mo'],
    [800 * 24 * hour, '2y']
  ])('%i ms ago reads %s', (elapsed, expected) => {
    expect(compactAge(ago(elapsed), now)).toBe(expected);
  });

  test('a future time reads now', () => {
    expect(compactAge(now + hour, now)).toBe('now');
  });
});
