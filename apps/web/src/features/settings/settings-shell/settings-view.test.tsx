import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SettingsView } from './settings-view';

const testState = vi.hoisted(() => ({
  aiMounts: 0,
  workspace: {
    activeOrganization: { id: 'org-acme', name: 'Acme Labs' },
    activeRole: 'owner',
    session: { user: { email: 'demo@groam.example', name: 'Demo' } }
  }
}));

vi.mock('@groam/ui/ai/context/agent-context', () => ({
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
  cleanup();
  testState.aiMounts = 0;
  testState.workspace = {
    activeOrganization: { id: 'org-acme', name: 'Acme Labs' },
    activeRole: 'owner',
    session: { user: { email: 'demo@groam.example', name: 'Demo' } }
  };
});

describe('SettingsView', () => {
  test('keeps people management on the group settings section', () => {
    render(<SettingsView activeSection="group" onSectionChange={vi.fn()} />);
    expect(screen.getByTestId('invite-member')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'New group' })).toBeNull();
    expect(screen.getByText('Group settings')).toBeTruthy();
    expect(screen.getByText('People settings')).toBeTruthy();
  });

  test('shows the AI section for every shell', () => {
    render(<SettingsView activeSection="ai" onSectionChange={vi.fn()} />);
    expect(screen.getByTestId('settings-section-ai')).toBeTruthy();
    expect(screen.getByText('AI settings 1')).toBeTruthy();
  });

  test('remounts AI settings when the active group changes', () => {
    const onSectionChange = vi.fn();
    const { rerender } = render(
      <SettingsView activeSection="ai" onSectionChange={onSectionChange} />
    );
    expect(screen.getByText('AI settings 1')).toBeTruthy();

    testState.workspace = {
      ...testState.workspace,
      activeOrganization: { id: 'org-other', name: 'Other Group' }
    };
    rerender(<SettingsView activeSection="ai" onSectionChange={onSectionChange} />);
    expect(screen.getByText('AI settings 2')).toBeTruthy();
  });
});
