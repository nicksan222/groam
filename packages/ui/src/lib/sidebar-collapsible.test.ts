import { expect, test } from 'vitest';
import { sidebarSectionToggleLabel } from './sidebar-collapsible';

test('names collapse and expand actions', () => {
  expect(sidebarSectionToggleLabel('trips', true)).toBe('Collapse trips');
  expect(sidebarSectionToggleLabel('trips', false)).toBe('Expand trips');
});
