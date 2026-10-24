import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SettingsFooter } from './settings-footer';

test('renders footer action content', async () => {
  const { container } = await render(
    <SettingsFooter>
      <p>Footer note</p>
      <button type="button">Save</button>
    </SettingsFooter>
  );

  await expect.element(page.getByText('Footer note')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('settings-footer');
});
