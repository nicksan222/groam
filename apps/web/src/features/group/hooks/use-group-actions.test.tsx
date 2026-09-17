import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useGroupActions } from './use-group-actions';

const auth = vi.hoisted(() => ({
  leave: vi.fn(),
  removeMember: vi.fn(),
  updateMemberRole: vi.fn()
}));

vi.mock('@groam/auth/client', () => ({
  authClient: {
    organization: {
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

beforeEach(() => vi.clearAllMocks());

describe('useGroupActions', () => {
  test('surfaces leave-group errors', async () => {
    auth.leave.mockResolvedValue({ data: null, error: { message: 'Owner cannot leave' } });
    const { result } = setup();

    await act(() => result.current.leaveGroup());

    expect(auth.leave).toHaveBeenCalledWith({ organizationId: 'organization-a' });
    expect(result.current.error).toBe('Owner cannot leave');
    expect(result.current.pendingAction).toBeNull();
  });

  test('uses a fallback when leaving fails without a message', async () => {
    auth.leave.mockResolvedValue({ data: null, error: {} });
    const { result } = setup();

    await act(() => result.current.leaveGroup());

    expect(result.current.error).toBe('Unable to leave group');
  });
});
