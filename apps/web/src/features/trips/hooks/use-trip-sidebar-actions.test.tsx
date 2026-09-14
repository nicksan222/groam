import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useTripSidebarActions } from './use-trip-sidebar-actions';

const convex = vi.hoisted(() => ({
  useMutation: vi.fn()
}));
const notifications = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('convex/react', () => convex);
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

const tripId = 'trip-1' as Id<'trips'>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTripSidebarActions', () => {
  test('archives a trip and clears pending state', async () => {
    const archive = vi.fn().mockResolvedValue(null);
    const favorite = vi.fn().mockResolvedValue(null);
    convex.useMutation.mockReturnValueOnce(archive).mockReturnValueOnce(favorite);

    const { result } = renderHook(() => useTripSidebarActions());
    await act(async () => {
      await result.current.archiveTrip(tripId);
    });

    expect(archive).toHaveBeenCalledWith({ tripId });
    expect(result.current.pendingTripId).toBeNull();
  });

  test('toasts when favouriting fails', async () => {
    const archive = vi.fn();
    const favorite = vi.fn().mockRejectedValue(new Error('Offline'));
    convex.useMutation.mockReturnValueOnce(archive).mockReturnValueOnce(favorite);

    const { result } = renderHook(() => useTripSidebarActions());
    await act(async () => {
      await result.current.toggleFavorite(tripId, false);
    });

    expect(favorite).toHaveBeenCalledWith({ favorite: true, tripId });
    expect(notifications.error).toHaveBeenCalledWith('Offline');
    expect(result.current.pendingTripId).toBeNull();
  });
});
