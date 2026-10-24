import { MonitorCog } from '@groam/icons';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import {
  SettingsAside,
  SettingsFooter,
  SettingsPanel,
  SettingsPanelHeading,
  SettingsSplitLayout,
  SettingsStack
} from './settings-panel';

describe('settings layout primitives', () => {
  test('SettingsStack stacks panels, which carry their own spacing', async () => {
    const { container } = await render(
      <SettingsStack>
        <p>First panel</p>
        <p>Second panel</p>
      </SettingsStack>
    );

    expect(container.firstElementChild?.className).toContain('flex-col');
    expect(container.firstElementChild?.className).not.toContain('space-y');
    await expect.element(page.getByText('First panel')).toBeInTheDocument();
    await expect.element(page.getByText('Second panel')).toBeInTheDocument();
  });

  test('SettingsPanelHeading renders title, description, and optional action', async () => {
    await render(
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
  });

  test('SettingsFooter renders action content', async () => {
    await render(
      <SettingsFooter>
        <p>Footer note</p>
        <button type="button">Save</button>
      </SettingsFooter>
    );

    await expect.element(page.getByText('Footer note')).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  test('SettingsAside renders informational copy', async () => {
    await render(
      <SettingsAside
        description="Theme changes apply on this device only."
        icon={MonitorCog}
        title="Saved locally"
      />
    );

    await expect.element(page.getByRole('heading', { name: 'Saved locally' })).toBeInTheDocument();
    await expect
      .element(page.getByText('Theme changes apply on this device only.'))
      .toBeInTheDocument();
  });

  test('SettingsSplitLayout renders main content and aside column', async () => {
    await render(
      <SettingsSplitLayout aside={<p>Aside content</p>}>
        <SettingsPanel>
          <p>Main content</p>
        </SettingsPanel>
      </SettingsSplitLayout>
    );

    await expect.element(page.getByText('Main content')).toBeInTheDocument();
    await expect.element(page.getByText('Aside content')).toBeInTheDocument();
  });
});
