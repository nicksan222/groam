import { shadcnComponents } from '@json-render/shadcn';
import { expect, test } from 'vitest';
import { checkboxInputStrategy } from './checkbox-input';

test('registers the checkbox input strategy', () => {
  expect(checkboxInputStrategy.Checkbox).toBe(shadcnComponents.Checkbox);
});
