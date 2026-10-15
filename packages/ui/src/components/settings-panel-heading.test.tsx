import { render } from '@groam/vitest-config/react';
import { MonitorCog } from 'lucide-react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SettingsPanelHeading } from './settings-panel-heading';

test('renders title, description, icon, and optional action', async () => {
  const { container } = await render(
    <SettingsPanelHeading
      action={<button type="button">Refresh</button>}
      description="Panel details"
      icon={MonitorCog}
      title="Panel title"
    />
  );

  await expect.element(page.getByRole('heading', { name: 'Panel title' })).toBeInTheDocument();
  await expect.element(page.getByText('Panel details')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  expect(container.querySelector('svg')).toBeTruthy();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('settings-panel-heading');
});
