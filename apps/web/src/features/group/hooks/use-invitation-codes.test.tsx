import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useInvitationCodes } from './use-invitation-codes';

const convex = vi.hoisted(() => ({ revoke: vi.fn(), useQuery: vi.fn() }));

vi.mock('convex/react', () => ({
  useMutation: () => convex.revoke,
  useQuery: (...args: unknown[]) => convex.useQuery(...args)
}));

beforeEach(() => {
  vi.clearAllMocks();
  convex.revoke.mockResolvedValue(undefined);
  convex.useQuery.mockReturnValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useInvitationCodes', () => {
  test('skips the list query when invitation management is disabled', () => {
    const { result } = renderHook(() => useInvitationCodes(false));

    expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
    expect(result.current).toMatchObject({ codes: [], isLoading: false, pendingId: null });
  });

  test('lists enabled codes and revokes a selected code', async () => {
    const codes = [{ id: 'invite-1', code: 'TRIP', expiresAt: null }];
    convex.useQuery.mockReturnValue(codes);
    const { result } = renderHook(() => useInvitationCodes(true));

    expect(convex.useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ now: expect.any(Number) })
    );
    expect(result.current.codes).toBe(codes);

    await act(() => result.current.revoke('invite-1' as never));
    expect(convex.revoke).toHaveBeenCalledWith({ invitationCodeId: 'invite-1' });
    expect(result.current).toMatchObject({ error: null, pendingId: null });
  });

  test('clears the pending code and exposes a revoke error', async () => {
    convex.revoke.mockRejectedValueOnce(new Error('Already revoked'));
    const { result } = renderHook(() => useInvitationCodes(true));

    await act(() => result.current.revoke('invite-1' as never));
    expect(result.current).toMatchObject({ error: 'Already revoked', pendingId: null });
  });

  test('uses the revoke fallback for an opaque backend rejection', async () => {
    convex.revoke.mockRejectedValueOnce(new Error('Server Error'));
    const { result } = renderHook(() => useInvitationCodes(true));

    await act(() => result.current.revoke('invite-1' as never));

    expect(result.current.error).toBe('Unable to revoke invitation code');
  });

  test('refreshes enabled codes every minute and clears the interval when disabled', () => {
    vi.useFakeTimers();
    const now = vi.spyOn(Date, 'now').mockReturnValue(100);
    const { rerender, unmount } = renderHook(({ enabled }) => useInvitationCodes(enabled), {
      initialProps: { enabled: true }
    });

    now.mockReturnValue(200);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    rerender({ enabled: false });
    unmount();

    expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), { now: 200 });
    now.mockRestore();
  });
});
