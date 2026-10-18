import { expect, test } from 'vite-plus/test';
import { mergeTimelineEvents } from './discussion-timeline-events';

const item = (key: string, createdAt: number) => ({ content: key, createdAt, key });

test('places events between messages by time', () => {
  const merged = mergeTimelineEvents(
    [item('m1', 10), item('m2', 30)],
    [item('e1', 20), item('e2', 40)],
    true
  );
  expect(merged.map((entry) => entry.key)).toEqual(['m1', 'e1', 'm2', 'e2']);
});

test('hides events older than a partial history', () => {
  const merged = mergeTimelineEvents([item('m1', 10)], [item('old', 5), item('new', 20)], false);
  expect(merged.map((entry) => entry.key)).toEqual(['m1', 'new']);
});

test('shows events alone in an empty, fully loaded thread', () => {
  expect(mergeTimelineEvents([], [item('e1', 1)], true).map((entry) => entry.key)).toEqual(['e1']);
});
