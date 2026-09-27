import { shadcnComponents } from '@json-render/shadcn';
import { expect, test } from 'vitest';
import { radioInputStrategy } from './radio-input';

test('registers the radio input strategy', () => {
  expect(radioInputStrategy.Radio).toBe(shadcnComponents.Radio);
});
