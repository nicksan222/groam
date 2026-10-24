import { type ComposerValue, getComposerText } from '@groam/ui/components/composer';
import { expect, test } from 'vite-plus/test';
import {
  AGENT_MENTION_ITEM,
  AGENT_MENTION_TOKEN,
  agentMentionTrigger,
  hasAgentMention,
  hasAgentMentionValue,
  insertAgentMention,
  insertAgentMentionValue,
  removeAgentMention,
  removeAgentMentionValue
} from './agent-mention';

const text = (value: string): ComposerValue => [{ text: value, type: 'text' }];

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

test('the "@" suggestion serializes to the token the backend detects', () => {
  const picked: ComposerValue = [
    { id: AGENT_MENTION_ITEM.id, label: AGENT_MENTION_ITEM.label, trigger: '@', type: 'mention' },
    { text: ' where should we eat?', type: 'text' }
  ];
  expect(getComposerText(picked)).toBe(`${AGENT_MENTION_TOKEN} where should we eat?`);
  expect(hasAgentMentionValue(picked)).toBe(true);
});

test('offers @groam only while the typed handle is a prefix of it', () => {
  const filter = agentMentionTrigger.filter;
  if (!filter) throw new Error('expected a filter');
  expect(agentMentionTrigger.character).toBe('@');
  expect(filter(AGENT_MENTION_ITEM, '')).toBe(true);
  expect(filter(AGENT_MENTION_ITEM, 'GR')).toBe(true);
  expect(filter(AGENT_MENTION_ITEM, 'ada')).toBe(false);
});

test('inserts a token into a draft once', () => {
  expect(getComposerText(insertAgentMentionValue([]))).toBe('@groam ');
  expect(getComposerText(insertAgentMentionValue(text('dinner')))).toBe('dinner @groam ');
  expect(getComposerText(insertAgentMentionValue(text('dinner ')))).toBe('dinner @groam ');
  const tagged = text('hi @groam');
  expect(insertAgentMentionValue(tagged)).toBe(tagged);
});

test('removes tokens and typed handles from a draft', () => {
  const tagged = insertAgentMentionValue(text('dinner'));
  expect(removeAgentMentionValue(tagged)).toEqual([{ text: 'dinner ', type: 'text' }]);
  expect(removeAgentMentionValue(text('hey @groam there'))).toEqual([
    { text: 'hey there', type: 'text' }
  ]);
  expect(removeAgentMentionValue(insertAgentMentionValue([]))).toEqual([]);
});
