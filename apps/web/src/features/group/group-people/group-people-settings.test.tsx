import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
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

afterEach(cleanup);

describe('GroupPeopleSettings', () => {
  test('lists members and active invitation codes for the active group', () => {
    render(<GroupPeopleSettings />);

    expect(screen.getByText('Members')).toBeTruthy();
    expect(
      screen.getByText('Everyone here shares this group’s trips and planning workspace.')
    ).toBeTruthy();
    expect(screen.getByText('Invitation codes')).toBeTruthy();
    expect(screen.getByText('ABCD-EFGH-JKLM')).toBeTruthy();
    expect(screen.getByText('A (you)')).toBeTruthy();
    expect(screen.getByText('@alice')).toBeTruthy();
  });
});
