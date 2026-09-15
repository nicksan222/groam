import { displayInitials as fromUi } from '@groam/ui/lib/avatar';
import { expect, test } from 'vitest';
import { displayInitials } from './display-initials';

test('re-exports the shared avatar helper', () => {
  expect(displayInitials).toBe(fromUi);
});
