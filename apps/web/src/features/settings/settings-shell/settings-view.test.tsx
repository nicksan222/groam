import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SettingsView as SettingsViewComponent } from './settings-view';

function SettingsView(props: ComponentProps<typeof SettingsViewComponent>) {
  return (
    <SidebarProvider>
      <SettingsViewComponent {...props} />
    </SidebarProvider>
  );
}

const testState = vi.hoisted(() => ({
  aiMounts: 0,
  workspace: {
    activeOrganization: { id: 'org-acme', name: 'Acme Labs' },
    activeRole: 'owner',
    session: { user: { email: 'demo@groam.example', name: 'Demo' } }
  }
}));

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => testState.workspace
}));

vi.mock('@/features/workspace/workspace-shell/workspace-dialog-state', () => ({
  useWorkspaceDialogs: () => ({ openDialog: vi.fn() })
}));

vi.mock('@/features/settings/settings-panels/ai-settings', async () => {
  const { useRef } = await import('react');
  return {
    AiSettings() {
      const generation = useRef<number | null>(null);
      if (generation.current === null) {
        testState.aiMounts += 1;
        generation.current = testState.aiMounts;
      }
      return <p>{`AI settings ${generation.current}`}</p>;
    }
  };
});

vi.mock('@/features/settings/settings-panels/appearance-settings', () => ({
  AppearanceSettings: () => <p>Appearance settings</p>
}));

vi.mock('@/features/group/group-people/group-people-settings', () => ({
  GroupPeopleSettings: () => <p>People settings</p>
}));

vi.mock('@/features/settings/settings-panels/organization-settings', () => ({
  OrganizationSettings: () => <p>Group settings</p>
}));

vi.mock('@/features/settings/settings-panels/profile-settings', () => ({
  ProfileSettings: () => <p>Profile settings</p>
}));

vi.mock('@/features/settings/settings-panels/security-settings', () => ({
  SecuritySettings: () => <p>Security settings</p>
}));

afterEach(() => {
  testState.aiMounts = 0;
  testState.workspace = {
    activeOrganization: { id: 'org-acme', name: 'Acme Labs' },
    activeRole: 'owner',
    session: { user: { email: 'demo@groam.example', name: 'Demo' } }
  };
});

describe('SettingsView', () => {
  test('keeps people management on the group settings section', async () => {
    await render(<SettingsView activeSection="group" onSectionChange={vi.fn()} />);
    await expect.element(page.getByTestId('invite-member')).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'New group' })).not.toBeInTheDocument();
    await expect.element(page.getByText('Group settings')).toBeInTheDocument();
    await expect.element(page.getByText('People settings')).toBeInTheDocument();
  });

  test('shows the AI section for every shell', async () => {
    await render(<SettingsView activeSection="ai" onSectionChange={vi.fn()} />);
    await expect.element(page.getByTestId('settings-section-ai')).toBeInTheDocument();
    await expect.element(page.getByText('AI settings 1')).toBeInTheDocument();
  });

  test('opens the AI section directly without redirecting', async () => {
    const onSectionChange = vi.fn();
    await render(<SettingsView activeSection="ai" onSectionChange={onSectionChange} />);
    await expect.element(page.getByTestId('settings-section-ai')).toBeInTheDocument();
    await expect.element(page.getByText('AI settings 1')).toBeInTheDocument();
    expect(onSectionChange).not.toHaveBeenCalled();
  });

  test('preserves personal AI settings when the active group changes', async () => {
    const onSectionChange = vi.fn();
    const { rerender } = await render(
      <SettingsView activeSection="ai" onSectionChange={onSectionChange} />
    );
    await expect.element(page.getByText('AI settings 1')).toBeInTheDocument();

    testState.workspace = {
      ...testState.workspace,
      activeOrganization: { id: 'org-other', name: 'Other Group' }
    };
    await rerender(<SettingsView activeSection="ai" onSectionChange={onSectionChange} />);
    await expect.element(page.getByText('AI settings 1')).toBeInTheDocument();
  });
});
