import { expect, test } from 'vite-plus/test';
import { draftAfterSend } from './draft';

test('clears an unchanged draft and keeps only what was typed after the send', () => {
  expect(draftAfterSend('Hello', 'Hello')).toBe('');
  expect(draftAfterSend('Hello world', 'Hello')).toBe('world');
  expect(draftAfterSend('Hi there', 'Hello')).toBe('Hi there');
});
