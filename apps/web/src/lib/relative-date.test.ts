import { afterEach, describe, expect, test, vi } from 'vite-plus/test';
import { relativeDate } from './relative-date';

afterEach(() => {
  vi.useRealTimers();
});

describe('relativeDate', () => {
  test('formats a day-relative timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
    expect(relativeDate(Date.parse('2026-01-14T12:00:00.000Z'))).toMatch(/yesterday|1 day ago/i);
  });
});
