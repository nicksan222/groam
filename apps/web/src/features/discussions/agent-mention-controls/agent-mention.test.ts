import { expect, test } from 'vitest';
import {
  agentMentionQuery,
  hasAgentMention,
  insertAgentMention,
  removeAgentMention,
  replaceAgentMentionQuery
} from './agent-mention';

test('detects and inserts @groam mentions', () => {
  expect(hasAgentMention('@groam hi')).toBe(true);
  expect(hasAgentMention('mail@groam.com')).toBe(false);
  expect(insertAgentMention('')).toBe('@groam ');
  expect(insertAgentMention('hello')).toBe('hello @groam ');
  expect(insertAgentMention('@groam already')).toBe('@groam already ');
});

test('removes @groam tokens', () => {
  expect(removeAgentMention('hey @groam there')).toBe('hey there');
  expect(removeAgentMention('@groam')).toBe('');
});

test('suggests while typing an @ query', () => {
  expect(agentMentionQuery('hello @gr', 9)).toBe('gr');
  expect(agentMentionQuery('hello @xx', 9)).toBeNull();
  expect(replaceAgentMentionQuery('hello @gr', 9)).toEqual({
    caret: 13,
    text: 'hello @groam '
  });
});
