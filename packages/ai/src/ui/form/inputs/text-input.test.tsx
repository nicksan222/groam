import { shadcnComponents } from '@json-render/shadcn';
import { expect, test } from 'vitest';
import { textInputStrategy } from './text-input';

test('registers the input input strategy', () => {
  expect(textInputStrategy.Input).toBe(shadcnComponents.Input);
});
