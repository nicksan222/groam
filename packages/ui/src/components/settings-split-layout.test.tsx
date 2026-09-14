import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { SettingsPanel } from './settings-panel';
import { SettingsSplitLayout } from './settings-split-layout';

afterEach(cleanup);

test('renders main content beside an aside column', () => {
  const { container } = render(
    <SettingsSplitLayout aside={<p>Aside content</p>}>
      <SettingsPanel>
        <p>Main content</p>
      </SettingsPanel>
    </SettingsSplitLayout>
  );

  expect(screen.getByText('Main content')).toBeTruthy();
  expect(screen.getByText('Aside content')).toBeTruthy();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('settings-split-layout');
});
