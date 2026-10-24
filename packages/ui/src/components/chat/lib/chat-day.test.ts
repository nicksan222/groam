import { describe, expect, test } from 'vite-plus/test';
import { chatDayLabel, isSameChatDay } from './chat-day';

const now = new Date(2026, 9, 22, 9, 30).getTime();
const at = (month: number, day: number, hour = 12, year = 2026) =>
  new Date(year, month, day, hour).getTime();

describe('chatDayLabel', () => {
  test.each([
    ['earlier today', at(9, 22, 0), 'Today'],
    ['yesterday', at(9, 21, 23), 'Yesterday'],
    ['this week', at(9, 18), new Date(at(9, 18)).toLocaleDateString(undefined, { weekday: 'long' })]
  ])('labels %s', (_label, time, expected) => {
    expect(chatDayLabel(time, now)).toBe(expected);
  });

  test('labels older days with their date, adding the year only when it differs', () => {
    expect(chatDayLabel(at(9, 1), now)).toBe(
      new Date(at(9, 1)).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        weekday: 'short'
      })
    );
    expect(chatDayLabel(at(11, 31, 12, 2025), now)).toContain('2025');
  });
});

test('compares local calendar days', () => {
  expect(isSameChatDay(at(9, 22, 0), at(9, 22, 23))).toBe(true);
  expect(isSameChatDay(at(9, 21, 23), at(9, 22, 0))).toBe(false);
});
