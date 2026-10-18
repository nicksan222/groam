import { expect, test } from 'vite-plus/test';
import type { DiscussionMessage } from '@/types/discussions';
import { groupAssistantReplies } from './assistant-replies';

const message = (partial: Partial<DiscussionMessage>) =>
  ({ key: 'k', order: 0, parts: [], role: 'user', text: '', ...partial }) as DiscussionMessage;

test('attaches each reply to the prompt of the same order', () => {
  const reply = message({ key: 'a1', role: 'assistant' });
  const orphan = message({ key: 'a2', order: 1, role: 'assistant' });
  const { attached, repliesByPrompt } = groupAssistantReplies([
    message({ key: 'u1', text: '@groam hotels?' }),
    reply,
    orphan
  ]);
  expect(repliesByPrompt.get('u1')).toEqual([reply]);
  expect(attached.has('a1')).toBe(true);
  expect(attached.has('a2')).toBe(false);
});
