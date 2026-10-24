import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SettingsStack } from './settings-stack';

test('stacks panels, which carry their own spacing', async () => {
  const { container } = await render(
    <SettingsStack>
      <p>First panel</p>
      <p>Second panel</p>
    </SettingsStack>
  );

  expect(container.firstElementChild?.className).toContain('flex-col');
  expect(container.firstElementChild?.className).not.toContain('space-y');
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('settings-stack');
  await expect.element(page.getByText('First panel')).toBeInTheDocument();
  await expect.element(page.getByText('Second panel')).toBeInTheDocument();
});
