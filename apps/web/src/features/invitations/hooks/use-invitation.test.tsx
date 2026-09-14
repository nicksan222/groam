import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  invitationAuth,
  invitationFixture,
  resetInvitationAuth
} from '@/features/invitations/invitation-auth';
import { useInvitation } from './use-invitation';

beforeEach(resetInvitationAuth);

describe('useInvitation', () => {
  test('loads invitation details for the requested id', async () => {
    const { result } = renderHook(() => useInvitation({ invitationId: 'invite-a' }));

    await waitFor(() => expect(result.current.invitation).toEqual(invitationFixture));
    expect(invitationAuth.getInvitation).toHaveBeenCalledWith({ query: { id: 'invite-a' } });
    expect(result.current.loadError).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  test('surfaces list errors without treating the invitation as loaded', async () => {
    invitationAuth.getInvitation.mockResolvedValue({
      data: null,
      error: { message: 'Invitation expired' }
    });
    const { result } = renderHook(() => useInvitation({ invitationId: 'invite-a' }));

    await waitFor(() => expect(result.current.loadError).toBe('Invitation expired'));
    expect(result.current.invitation).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  test('surfaces thrown list failures with a fallback message', async () => {
    invitationAuth.getInvitation.mockRejectedValue(new Error('Network down'));
    const { result } = renderHook(() => useInvitation({ invitationId: 'invite-a' }));

    await waitFor(() => expect(result.current.loadError).toBe('Network down'));
  });

  test('keeps invitation details visible when accept fails', async () => {
    invitationAuth.acceptInvitation.mockResolvedValue({
      data: null,
      error: { message: 'This invitation was already used' }
    });
    const onResolved = vi.fn();
    const { result } = renderHook(() => useInvitation({ invitationId: 'invite-a', onResolved }));

    await waitFor(() => expect(result.current.invitation).toEqual(invitationFixture));
    await act(() => result.current.respond('accept'));

    expect(invitationAuth.acceptInvitation).toHaveBeenCalledWith({ invitationId: 'invite-a' });
    expect(result.current.actionError).toBe('This invitation was already used');
    expect(result.current.invitation).toEqual(invitationFixture);
    expect(result.current.action).toBeNull();
    expect(onResolved).not.toHaveBeenCalled();
  });

  test('navigates after a successful accept', async () => {
    const onResolved = vi.fn();
    const { result } = renderHook(() => useInvitation({ invitationId: 'invite-a', onResolved }));

    await waitFor(() => expect(result.current.invitation).toEqual(invitationFixture));
    await act(() => result.current.respond('accept'));

    expect(onResolved).toHaveBeenCalledOnce();
    expect(result.current.actionError).toBeNull();
  });

  test('surfaces decline errors without clearing the invitation', async () => {
    invitationAuth.rejectInvitation.mockResolvedValue({
      data: null,
      error: { message: 'Unable to decline invitation' }
    });
    const { result } = renderHook(() => useInvitation({ invitationId: 'invite-a' }));

    await waitFor(() => expect(result.current.invitation).toEqual(invitationFixture));
    await act(() => result.current.respond('reject'));

    expect(result.current.actionError).toBe('Unable to decline invitation');
    expect(result.current.invitation).toEqual(invitationFixture);
  });
});
