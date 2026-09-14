import { cleanup, render, screen } from '@testing-library/react';
import { MonitorCog } from 'lucide-react';
import { afterEach, expect, test } from 'vitest';
import { SettingsPanelHeading } from './settings-panel-heading';

afterEach(cleanup);

test('renders title, description, icon, and optional action', () => {
  const { container } = render(
    <SettingsPanelHeading
      action={<button type="button">Refresh</button>}
      description="Panel details"
      icon={MonitorCog}
      title="Panel title"
    />
  );

  expect(screen.getByRole('heading', { name: 'Panel title' })).toBeTruthy();
  expect(screen.getByText('Panel details')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy();
  expect(container.querySelector('svg')).toBeTruthy();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('settings-panel-heading');
});
