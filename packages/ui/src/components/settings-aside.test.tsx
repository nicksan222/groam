import { cleanup, render, screen } from '@testing-library/react';
import { MonitorCog } from 'lucide-react';
import { afterEach, expect, test } from 'vitest';
import { SettingsAside } from './settings-aside';

afterEach(cleanup);

test('renders informational aside copy with an icon heading', () => {
  const { container } = render(
    <SettingsAside
      description="Theme changes apply on this device only."
      icon={MonitorCog}
      title="Saved locally"
    >
      <p>Extra note</p>
    </SettingsAside>
  );

  expect(screen.getByRole('heading', { name: 'Saved locally' })).toBeTruthy();
  expect(screen.getByText('Theme changes apply on this device only.')).toBeTruthy();
  expect(screen.getByText('Extra note')).toBeTruthy();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('settings-aside');
});
