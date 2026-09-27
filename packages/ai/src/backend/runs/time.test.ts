import { expect, test } from 'vitest';
import { agentRunDuration, agentRunTime } from './time';

const noon = new Date('2026-08-22T12:00:00').getTime();
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

test('labels a run from this minute as just now', () => {
  expect(agentRunTime(noon - 20_000, noon)).toBe('Just now');
});

test('uses relative minutes for recent runs', () => {
  expect(agentRunTime(noon - 5 * 60_000, noon)).toBe(relative.format(-5, 'minute'));
});

test('uses relative hours within the day', () => {
  expect(agentRunTime(noon - 3 * 3_600_000, noon)).toBe(relative.format(-3, 'hour'));
});

test('falls back to an absolute date for older runs', () => {
  const timestamp = new Date('2026-07-01T12:00:00').getTime();
  expect(agentRunTime(timestamp, noon)).toBe(
    new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(timestamp)
  );
});

test('formats run duration in compact units', () => {
  expect(agentRunDuration(noon, noon + 8_000)).toBe('8s');
  expect(agentRunDuration(noon, noon + 2 * 60_000)).toBe('2m');
  expect(agentRunDuration(noon, noon + 2 * 60_000 + 5_000)).toBe('2m 5s');
  expect(agentRunDuration(noon, noon + 3_600_000 + 120_000)).toBe('1h 2m');
});
