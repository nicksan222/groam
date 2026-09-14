import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { ActiveOrganization } from '@/features/workspace/workspace-shell/workspace-state';
import { InvitationsSection } from './invitations-section';

afterEach(cleanup);

const organization = {
  invitations: [
    {
      email: 'pending@company.com',
      id: 'invite-pending',
      role: 'member',
      status: 'pending'
    },
    {
      email: 'accepted@company.com',
      id: 'invite-accepted',
      role: 'admin',
      status: 'accepted'
    }
  ]
} as ActiveOrganization;

test('renders pending invitations and lets managers cancel them', () => {
  const onCancel = vi.fn();
  render(
    <InvitationsSection
      canManage
      onCancel={onCancel}
      organization={organization}
      pendingAction={null}
    />
  );

  expect(screen.getByText('pending@company.com')).toBeTruthy();
  expect(screen.getByText('accepted@company.com')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Cancel' })).toHaveLength(1);
  expect(document.querySelector('table')).toBeTruthy();
  expect(screen.getByLabelText('Search invitations')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCancel).toHaveBeenCalledWith('invite-pending');
});

test('hides cancel actions for members and already-resolved invites', () => {
  render(
    <InvitationsSection
      canManage={false}
      onCancel={vi.fn()}
      organization={organization}
      pendingAction={null}
    />
  );

  expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
});

test('disables cancel while the matching invitation is pending', () => {
  render(
    <InvitationsSection
      canManage
      onCancel={vi.fn()}
      organization={organization}
      pendingAction="invite-invite-pending"
    />
  );

  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true);
});

test('renders nothing when the invitation list is empty', () => {
  const { container } = render(
    <InvitationsSection
      canManage
      onCancel={vi.fn()}
      organization={{ ...organization, invitations: [] }}
      pendingAction={null}
    />
  );

  expect(container.innerHTML).toBe('');
});
