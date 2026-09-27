import { expect, test } from 'vitest';
import { assistantContextTagInputSchema, isAssistantContextTagKind } from './index';

test('accepts only the declared tag kinds', () => {
  expect(isAssistantContextTagKind('trip')).toBe(true);
  expect(isAssistantContextTagKind('destination')).toBe(true);
  expect(isAssistantContextTagKind('activity')).toBe(true);
  expect(isAssistantContextTagKind('toString')).toBe(false);
  expect(isAssistantContextTagKind('constructor')).toBe(false);
  expect(isAssistantContextTagKind('__proto__')).toBe(false);
});

test('exposes a shared tag input schema', () => {
  expect(assistantContextTagInputSchema()).toBe(assistantContextTagInputSchema());
});
