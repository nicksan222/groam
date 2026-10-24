import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useTripSidebarActions } from './use-trip-sidebar-actions';

const convex = vi.hoisted(() => ({
  useMutation: vi.fn()
}));
const notifications = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

const tripId = 'trip-1' as Id<'trips'>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTripSidebarActions', () => {
  test('favourites a trip and clears pending state', async () => {
    const favorite = vi.fn().mockResolvedValue(null);
    convex.useMutation.mockReturnValue(favorite);

    const { result } = await renderHook(() => useTripSidebarActions());
    await act(async () => {
      await result.current.toggleFavorite(tripId, false);
    });

    expect(favorite).toHaveBeenCalledWith({ favorite: true, tripId });
    expect(result.current.pendingTripId).toBeNull();
  });

  test('toasts when favouriting fails', async () => {
    convex.useMutation.mockReturnValue(vi.fn().mockRejectedValue(new Error('Offline')));

    const { result } = await renderHook(() => useTripSidebarActions());
    await act(async () => {
      await result.current.toggleFavorite(tripId, false);
    });

    expect(notifications.error).toHaveBeenCalledWith('Offline');
    expect(result.current.pendingTripId).toBeNull();
  });

  test('inverts an existing favourite and uses the unfavourite fallback', async () => {
    const favorite = vi.fn().mockRejectedValue(new Error('Server Error'));
    convex.useMutation.mockReturnValue(favorite);

    const { result } = await renderHook(() => useTripSidebarActions());
    await act(async () => {
      await result.current.toggleFavorite(tripId, true);
    });

    expect(favorite).toHaveBeenCalledWith({ favorite: false, tripId });
    expect(notifications.error).toHaveBeenCalledWith('Unable to unfavourite trip');
  });
});
