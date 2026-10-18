import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SettingsPanel } from './settings-panel';

test('renders a padded settings panel around its children', async () => {
  const { container } = await render(
    <SettingsPanel>
      <p>Profile fields</p>
    </SettingsPanel>
  );

  await expect.element(page.getByText('Profile fields')).toBeInTheDocument();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('settings-panel');
  expect(container.firstElementChild?.className).toContain('dashboard-panel');
});
