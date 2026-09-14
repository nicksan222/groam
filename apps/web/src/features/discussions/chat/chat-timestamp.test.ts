import { expect, test } from 'vitest';
import { chatTimestamp } from './chat-timestamp';

const noon = new Date('2026-08-17T12:00:00').getTime();

test('shows a clock time for messages from today', () => {
  const timestamp = new Date('2026-08-17T09:30:00').getTime();
  expect(chatTimestamp(timestamp, noon)).toBe(
    new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(timestamp)
  );
});

test('labels yesterday without a clock time', () => {
  expect(chatTimestamp(new Date('2026-08-16T18:00:00').getTime(), noon)).toBe('Yesterday');
});

test('uses a relative day for the past week', () => {
  const timestamp = new Date('2026-08-14T12:00:00').getTime();
  expect(chatTimestamp(timestamp, noon)).toBe(
    new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-3, 'day')
  );
});

test('falls back to an absolute date for older chats', () => {
  const timestamp = new Date('2026-07-01T12:00:00').getTime();
  expect(chatTimestamp(timestamp, noon)).toBe(
    new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(timestamp)
  );
});
