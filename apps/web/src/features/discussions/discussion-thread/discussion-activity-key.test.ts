import { describe, expect, test } from 'vite-plus/test';
import { discussionActivityKey } from './discussion-activity-key';

type Message = Parameters<typeof discussionActivityKey>[0][number];

function message(overrides: Partial<Message> = {}): Message {
  return { key: 'm-1', status: 'success', ...overrides };
}

describe('discussionActivityKey', () => {
  test('is stable for an empty thread', () => {
    expect(discussionActivityKey([])).toBe('0');
  });

  test('changes when a new message arrives', () => {
    const before = discussionActivityKey([message()]);
    const after = discussionActivityKey([message(), message({ key: 'm-2' })]);
    expect(after).not.toBe(before);
  });

  test('changes when the newest message finishes streaming', () => {
    const streaming = discussionActivityKey([message({ status: 'streaming' })]);
    const done = discussionActivityKey([message({ status: 'success' })]);
    expect(done).not.toBe(streaming);
  });

  test('changes when the assistant request fails without a new message', () => {
    const pending = discussionActivityKey([message({ assistantStatus: 'responding' })]);
    const failed = discussionActivityKey([message({ assistantStatus: 'failed' })]);
    expect(failed).not.toBe(pending);
  });

  test('ignores streamed text so reads are not marked per chunk', () => {
    const first = { ...message({ status: 'streaming' }), text: 'Hel' };
    const second = { ...message({ status: 'streaming' }), text: 'Hello there' };
    expect(discussionActivityKey([second])).toBe(discussionActivityKey([first]));
  });
});
