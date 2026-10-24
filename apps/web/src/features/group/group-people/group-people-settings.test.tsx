import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';
import { testIds } from '@/lib/test-ids';
import { GroupPeopleSettings } from './group-people-settings';

const workspace = vi.hoisted(() => ({
  activeOrganization: {
    id: 'org-demo',
    invitations: [{ id: 'invite-1', email: 'a@x', role: 'member', status: 'pending' }],
    members: [
      {
        id: 'member-1',
        role: 'owner',
        user: { email: 'a@x', name: 'A', username: 'alice' },
        userId: 'user-a'
      },
      {
        id: 'member-2',
        role: 'member',
        user: { email: 'b@x', name: 'B', username: 'bob' },
        userId: 'user-b'
      }
    ],
    name: 'Groam Demo'
  },
  activeRole: 'owner',
  session: {
    session: {},
    user: { id: 'user-a' }
  }
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => workspace
}));

vi.mock('@/features/group/hooks/use-group-actions', () => ({
  useGroupActions: () => ({
    error: null,
    leaveGroup: vi.fn(),
    pendingAction: null,
    removeMember: vi.fn(),
    updateMemberRole: vi.fn()
  })
}));

vi.mock('@/features/group/hooks/use-invitation-codes', () => ({
  useInvitationCodes: () => ({
    codes: [
      {
        code: 'ABCD-EFGH-JKLM',
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000,
        id: 'code-a',
        role: 'member'
      }
    ],
    error: null,
    isLoading: false,
    pendingId: null,
    revoke: vi.fn()
  })
}));

describe('GroupPeopleSettings', () => {
  test('lists members and active invitation codes for the active group', async () => {
    await render(<GroupPeopleSettings />);

    await expect.element(page.getByText('Members')).toBeInTheDocument();
    await expect
      .element(page.getByText('Everyone here shares this group’s trips and planning workspace.'))
      .toBeInTheDocument();
    await expect.element(page.getByText('Invitation codes')).toBeInTheDocument();
    await expect.element(page.getByText('ABCD-EFGH-JKLM')).toBeInTheDocument();
    await expect.element(page.getByText('A (you)')).toBeInTheDocument();
    await expect.element(page.getByText('@alice')).toBeInTheDocument();
  });

  test('creates invitation codes from the Invitation codes panel, the one place for it', async () => {
    await render(<GroupPeopleSettings />);
    await page.getByTestId(testIds.inviteMember).click();
    expect(useWorkspaceDialogs.getState().dialog).toBe('invite');
  });
});
