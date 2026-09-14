import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { SettingsPanel } from './settings-panel';

afterEach(cleanup);

test('renders a padded settings panel around its children', () => {
  const { container } = render(
    <SettingsPanel>
      <p>Profile fields</p>
    </SettingsPanel>
  );

  expect(screen.getByText('Profile fields')).toBeTruthy();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('settings-panel');
  expect(container.firstElementChild?.className).toContain('dashboard-panel');
});
