import { expect, test } from 'vite-plus/test';
import { activityDayLabel, activityMessage } from './trip-activity-history-filter';

test('the viewer reads their own events as You', () => {
  const item = {
    actorName: 'Groam Demo',
    actorUserId: 'me',
    message: 'Groam Demo started an idea',
    type: 'proposed_version_created'
  } as never;
  expect(activityMessage(item, 'me')).toBe('You started an idea');
  expect(activityMessage(item, 'someone-else')).toBe('Groam Demo started an idea');
  expect(activityMessage(item, undefined)).toBe('Groam Demo started an idea');
});

test('labels a day as Today, Yesterday, or its date', () => {
  const now = new Date(2026, 9, 23, 15, 0).getTime();
  expect(activityDayLabel(new Date(2026, 9, 23, 8, 0).getTime(), now)).toBe('Today');
  expect(activityDayLabel(new Date(2026, 9, 22, 23, 0).getTime(), now)).toBe('Yesterday');
  expect(activityDayLabel(new Date(2026, 9, 21, 9, 0).getTime(), now)).toMatch(/21/u);
  expect(activityDayLabel(new Date(2025, 9, 21, 9, 0).getTime(), now)).toMatch(/2025/u);
});
