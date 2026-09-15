import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { SettingsFooter } from './settings-footer';

afterEach(cleanup);

test('renders footer action content', () => {
  const { container } = render(
    <SettingsFooter>
      <p>Footer note</p>
      <button type="button">Save</button>
    </SettingsFooter>
  );

  expect(screen.getByText('Footer note')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('settings-footer');
});
