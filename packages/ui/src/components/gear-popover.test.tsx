import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { GearPopover } from './gear-popover';
import { PopoverDescription, PopoverHeader, PopoverTitle } from './popover';

test('renders a gear trigger with an accessible label', async () => {
  await render(
    <GearPopover label="Issue settings">
      <p>Close issue</p>
    </GearPopover>
  );

  await expect.element(page.getByRole('button', { name: 'Issue settings' })).toBeInTheDocument();
});

test('caps popover height so a long assignee list can scroll under the header', async () => {
  await render(
    <GearPopover label="Edit assignees">
      <PopoverHeader>
        <PopoverTitle>Assignees</PopoverTitle>
        <PopoverDescription>Assign a person or the Issue agent.</PopoverDescription>
      </PopoverHeader>
      <button type="button">Issue agent</button>
      <button type="button">Groam Demo</button>
    </GearPopover>
  );

  await page.getByRole('button', { name: 'Edit assignees' }).click();
  const content = document.querySelector('[data-slot="popover-content"]');
  const header = document.querySelector('[data-slot="popover-header"]');

  expect(content?.className).toContain('max-h-(--radix-popover-content-available-height)');
  expect(content?.className).toContain('overflow-y-auto');
  expect(header?.className).toContain('sticky');
  expect(header?.className).toContain('bg-popover');
});
