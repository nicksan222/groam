import { render } from '@groam/vitest-config/react';
import { MonitorCog } from 'lucide-react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SettingsAside } from './settings-aside';

test('renders informational aside copy with an icon heading', async () => {
  const { container } = await render(
    <SettingsAside
      description="Theme changes apply on this device only."
      icon={MonitorCog}
      title="Saved locally"
    >
      <p>Extra note</p>
    </SettingsAside>
  );

  await expect.element(page.getByRole('heading', { name: 'Saved locally' })).toBeInTheDocument();
  await expect
    .element(page.getByText('Theme changes apply on this device only.'))
    .toBeInTheDocument();
  await expect.element(page.getByText('Extra note')).toBeInTheDocument();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('settings-aside');
});
