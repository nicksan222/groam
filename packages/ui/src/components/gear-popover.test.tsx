import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { stubPopoverEnvironment } from '#src/lib/stub-popover-environment';
import { GearPopover } from './gear-popover';
import { PopoverDescription, PopoverHeader, PopoverTitle } from './popover';

afterEach(cleanup);

test('renders a gear trigger with an accessible label', () => {
  render(
    <GearPopover label="Issue settings">
      <p>Close issue</p>
    </GearPopover>
  );

  expect(screen.getByRole('button', { name: 'Issue settings' })).toBeTruthy();
});

test('caps popover height so a long assignee list can scroll under the header', () => {
  stubPopoverEnvironment();
  render(
    <GearPopover label="Edit assignees">
      <PopoverHeader>
        <PopoverTitle>Assignees</PopoverTitle>
        <PopoverDescription>Assign a person or the Issue agent.</PopoverDescription>
      </PopoverHeader>
      <button type="button">Issue agent</button>
      <button type="button">Groam Demo</button>
    </GearPopover>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Edit assignees' }));
  const content = document.querySelector('[data-slot="popover-content"]');
  const header = document.querySelector('[data-slot="popover-header"]');

  expect(content?.className).toContain('max-h-(--radix-popover-content-available-height)');
  expect(content?.className).toContain('overflow-y-auto');
  expect(header?.className).toContain('sticky');
  expect(header?.className).toContain('bg-popover');
});
