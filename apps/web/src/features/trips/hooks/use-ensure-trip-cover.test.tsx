import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useEnsureTripCover } from './use-ensure-trip-cover';
import type { TripDetail } from './use-trips';

const convex = vi.hoisted(() => ({ useMutation: vi.fn() }));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));

const tripId = 'trip-1' as Id<'trips'>;

beforeEach(() => {
  vi.clearAllMocks();
  convex.useMutation.mockReturnValue(vi.fn().mockResolvedValue(null));
});

describe('useEnsureTripCover', () => {
  test('ensures a missing trip cover once the trip has destinations', async () => {
    const ensure = vi.fn().mockResolvedValue(null);
    convex.useMutation.mockReturnValue(ensure);

    await renderHook(() =>
      useEnsureTripCover(tripId, {
        coverStatus: null,
        destinations: [{ id: 'destination-1' }]
      } as unknown as TripDetail)
    );

    expect(ensure).toHaveBeenCalledWith({ tripId });
  });

  test('does not ensure a cover for an empty trip or an already-resolved cover', async () => {
    const ensure = vi.fn();
    convex.useMutation.mockReturnValue(ensure);

    const { rerender } = await renderHook(({ trip }) => useEnsureTripCover(tripId, trip), {
      initialProps: {
        trip: { coverStatus: null, destinations: [] } as unknown as TripDetail
      }
    });
    await rerender({
      trip: {
        coverStatus: 'ready',
        destinations: [{ id: 'destination-1' }]
      } as unknown as TripDetail
    });

    expect(ensure).not.toHaveBeenCalled();
  });
});
