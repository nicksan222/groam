import { cleanup, render, screen } from '@testing-library/react';
import { MonitorCog } from 'lucide-react';
import { afterEach, describe, expect, test } from 'vitest';
import {
  SettingsAside,
  SettingsFooter,
  SettingsPanel,
  SettingsPanelHeading,
  SettingsSplitLayout,
  SettingsStack
} from './settings-panel';

afterEach(cleanup);

describe('settings layout primitives', () => {
  test('SettingsStack groups panels with vertical spacing', () => {
    const { container } = render(
      <SettingsStack>
        <p>First panel</p>
        <p>Second panel</p>
      </SettingsStack>
    );

    expect(container.firstElementChild?.className).toContain('space-y-5');
    expect(screen.getByText('First panel')).toBeTruthy();
    expect(screen.getByText('Second panel')).toBeTruthy();
  });

  test('SettingsPanelHeading renders title, description, and optional action', () => {
    render(
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
  });

  test('SettingsFooter renders action content', () => {
    render(
      <SettingsFooter>
        <p>Footer note</p>
        <button type="button">Save</button>
      </SettingsFooter>
    );

    expect(screen.getByText('Footer note')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  test('SettingsAside renders informational copy', () => {
    render(
      <SettingsAside
        description="Theme changes apply on this device only."
        icon={MonitorCog}
        title="Saved locally"
      />
    );

    expect(screen.getByRole('heading', { name: 'Saved locally' })).toBeTruthy();
    expect(screen.getByText('Theme changes apply on this device only.')).toBeTruthy();
  });

  test('SettingsSplitLayout renders main content and aside column', () => {
    render(
      <SettingsSplitLayout aside={<p>Aside content</p>}>
        <SettingsPanel>
          <p>Main content</p>
        </SettingsPanel>
      </SettingsSplitLayout>
    );

    expect(screen.getByText('Main content')).toBeTruthy();
    expect(screen.getByText('Aside content')).toBeTruthy();
  });
});
