import { shadcnComponents } from '@json-render/shadcn';
import { expect, test } from 'vitest';
import { selectInputStrategy } from './select-input';

test('registers the select input strategy', () => {
  expect(selectInputStrategy.Select).toBe(shadcnComponents.Select);
});
