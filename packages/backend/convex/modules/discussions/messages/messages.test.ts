import { expect, test } from 'vitest';
import { Messages } from '#convex/modules/discussions/messages/index';

test('normalizes message content and rejects empty or oversized text', () => {
  expect(Messages.normalizeContent('  hello  ', 'Message')).toEqual({
    format: 'plain_text',
    text: 'hello'
  });
  expect(Messages.normalizeContent('   ', 'Comment', { allowEmpty: true })).toEqual({
    format: 'plain_text',
    text: ''
  });
  expect(() => Messages.normalizeContent('   ', 'Message')).toThrow(
    'Message text must be between 1 and 5000 characters'
  );
  expect(() => Messages.normalizeContent('x'.repeat(5_001), 'Comment')).toThrow(
    'Comment text must be at most 5000 characters'
  );
});

test('normalizes request ids and rejects short or oversized values', () => {
  expect(Messages.normalizeRequestId('  request-1  ', 'Discussion')).toBe('request-1');
  expect(() => Messages.normalizeRequestId('short', 'Message')).toThrow(
    'Message request id must be between 8 and 100 characters'
  );
  expect(() => Messages.normalizeRequestId('x'.repeat(101), 'Discussion')).toThrow(
    'Discussion request id must be between 8 and 100 characters'
  );
});
