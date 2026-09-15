import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { GroupPeopleSettings } from './group-people-settings';

const workspace = vi.hoisted(() => ({
  activeOrganization: {
    id: 'org-demo',
    invitations: [{ id: 'invite-1', email: 'a@x', role: 'member', status: 'pending' }],
    members: [
      { id: 'member-1', role: 'owner', user: { email: 'a@x', name: 'A' }, userId: 'user-a' },
      { id: 'member-2', role: 'member', user: { email: 'b@x', name: 'B' }, userId: 'user-b' }
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
    cancelInvitation: vi.fn(),
    error: null,
    leaveGroup: vi.fn(),
    pendingAction: null,
    removeMember: vi.fn(),
    updateMemberRole: vi.fn()
  })
}));

afterEach(cleanup);

describe('GroupPeopleSettings', () => {
  test('lists members and pending invitations for the active group', () => {
    render(<GroupPeopleSettings />);

    expect(screen.getByText('Members')).toBeTruthy();
    expect(
      screen.getByText('Everyone here shares this group’s trips and planning workspace.')
    ).toBeTruthy();
    expect(screen.getByText('Invitations')).toBeTruthy();
    expect(screen.getByText('A (you)')).toBeTruthy();
    expect(screen.getAllByText('a@x').length).toBeGreaterThan(0);
  });
});
