import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useEnsureTripCover } from './use-ensure-trip-cover';
import type { TripDetail } from './use-trips';

const convex = vi.hoisted(() => ({ useMutation: vi.fn() }));

vi.mock('convex/react', () => convex);

const tripId = 'trip-1' as Id<'trips'>;

beforeEach(() => {
  vi.clearAllMocks();
  convex.useMutation.mockReturnValue(vi.fn().mockResolvedValue(null));
});

describe('useEnsureTripCover', () => {
  test('ensures a missing trip cover once the trip has destinations', () => {
    const ensure = vi.fn().mockResolvedValue(null);
    convex.useMutation.mockReturnValue(ensure);

    renderHook(() =>
      useEnsureTripCover(tripId, {
        coverStatus: null,
        destinations: [{ id: 'destination-1' }]
      } as unknown as TripDetail)
    );

    expect(ensure).toHaveBeenCalledWith({ tripId });
  });

  test('does not ensure a cover for an empty trip or an already-resolved cover', () => {
    const ensure = vi.fn();
    convex.useMutation.mockReturnValue(ensure);

    const { rerender } = renderHook(({ trip }) => useEnsureTripCover(tripId, trip), {
      initialProps: {
        trip: { coverStatus: null, destinations: [] } as unknown as TripDetail
      }
    });
    rerender({
      trip: {
        coverStatus: 'ready',
        destinations: [{ id: 'destination-1' }]
      } as unknown as TripDetail
    });

    expect(ensure).not.toHaveBeenCalled();
  });
});
