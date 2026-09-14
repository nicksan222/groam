import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useGroupActions } from './use-group-actions';

const auth = vi.hoisted(() => ({
  cancelInvitation: vi.fn(),
  leave: vi.fn(),
  removeMember: vi.fn(),
  updateMemberRole: vi.fn()
}));

vi.mock('@groam/auth/client', () => ({
  authClient: {
    organization: {
      cancelInvitation: auth.cancelInvitation,
      leave: auth.leave,
      removeMember: auth.removeMember,
      updateMemberRole: auth.updateMemberRole
    }
  }
}));

function setup() {
  return renderHook(() =>
    useGroupActions({
      organizationId: 'organization-a'
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.cancelInvitation.mockResolvedValue({ data: {}, error: null });
});

describe('useGroupActions', () => {
  test('surfaces cancel-invitation errors from the pending list', async () => {
    auth.cancelInvitation.mockResolvedValue({
      data: null,
      error: { message: 'Invitation already accepted' }
    });
    const { result } = setup();

    await act(() => result.current.cancelInvitation('invite-a'));

    expect(auth.cancelInvitation).toHaveBeenCalledWith({ invitationId: 'invite-a' });
    expect(result.current.error).toBe('Invitation already accepted');
    expect(result.current.pendingAction).toBeNull();
  });

  test('uses a fallback when cancel invitation fails without a message', async () => {
    auth.cancelInvitation.mockResolvedValue({ data: null, error: {} });
    const { result } = setup();

    await act(() => result.current.cancelInvitation('invite-a'));

    expect(result.current.error).toBe('Unable to cancel invitation');
  });
});
