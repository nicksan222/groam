import { afterEach, describe, expect, test, vi } from 'vitest';
import { relativeIssueDate } from './issue-relative-date';

afterEach(() => {
  vi.useRealTimers();
});

describe('relativeIssueDate', () => {
  test('formats a day-relative timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
    expect(relativeIssueDate(Date.parse('2026-01-14T12:00:00.000Z'))).toMatch(
      /yesterday|1 day ago/i
    );
  });
});
