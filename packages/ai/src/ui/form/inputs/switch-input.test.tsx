import { shadcnComponents } from '@json-render/shadcn';
import { expect, test } from 'vitest';
import { switchInputStrategy } from './switch-input';

test('registers the switch input strategy', () => {
  expect(switchInputStrategy.Switch).toBe(shadcnComponents.Switch);
});
