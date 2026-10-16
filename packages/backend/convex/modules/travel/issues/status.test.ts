import { expect, test } from 'vite-plus/test';
import { isResolved, statusChangeMessage } from '#convex/modules/travel/issues/status';

test.each([
  ['open', false],
  ['in_progress', false],
  ['closed', true],
  ['wont_do', true]
] as const)('%s resolved: %s', (status, resolved) => {
  expect(isResolved(status)).toBe(resolved);
});

test.each([
  ['in_progress', 'started working on this'],
  ['closed', 'closed this'],
  ['wont_do', "marked this as won't do"],
  ['open', 'reopened this']
] as const)('words a move to %s', (status, message) => {
  expect(statusChangeMessage(status)).toBe(message);
});
