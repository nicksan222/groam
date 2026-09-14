import { expect, test } from 'vitest';
import { groupThreadReactions } from './thread-message-stamps';

test('groups reactions in stamp order and marks the viewer', () => {
  expect(
    groupThreadReactions(
      [
        { emoji: '🎉', userId: 'b' },
        { emoji: '👍', userId: 'a' },
        { emoji: '👍', userId: 'b' },
        { emoji: '✈️', userId: 'a' }
      ],
      'a'
    )
  ).toEqual([
    { count: 2, emoji: '👍', label: 'Agree', mine: true },
    { count: 1, emoji: '🎉', label: "Let's go", mine: false },
    { count: 1, emoji: '✈️', label: '✈️', mine: true }
  ]);
});
