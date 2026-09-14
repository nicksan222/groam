import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useClaimInvitation } from './use-claim-invitation';

const convex = vi.hoisted(() => ({
  useMutation: vi.fn()
}));

vi.mock('convex/react', () => convex);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useClaimInvitation', () => {
  test('returns the claimed trip id', async () => {
    const claim = vi.fn().mockResolvedValue('trip-1');
    convex.useMutation.mockReturnValue(claim);
    const { result } = renderHook(() => useClaimInvitation());

    let tripId: Id<'trips'> | null = null;
    await act(async () => {
      tripId = await result.current('invite-1');
    });

    expect(claim).toHaveBeenCalledWith({ invitationId: 'invite-1' });
    expect(tripId).toBe('trip-1');
  });

  test('returns null when claim fails', async () => {
    const claim = vi.fn().mockRejectedValue(new Error('Already claimed'));
    convex.useMutation.mockReturnValue(claim);
    const { result } = renderHook(() => useClaimInvitation());

    let tripId: Id<'trips'> | null = 'trip-x' as Id<'trips'>;
    await act(async () => {
      tripId = await result.current('invite-1');
    });

    expect(tripId).toBeNull();
  });
});
