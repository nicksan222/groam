import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useEnsureDestinationCovers } from './use-ensure-destination-covers';
import type { TripDetail } from './use-trips';

const convex = vi.hoisted(() => ({ useMutation: vi.fn() }));

vi.mock('convex/react', () => convex);

const tripId = 'trip-1' as Id<'trips'>;

beforeEach(() => {
  vi.clearAllMocks();
  convex.useMutation.mockReturnValue(vi.fn().mockResolvedValue(null));
});

describe('useEnsureDestinationCovers', () => {
  test('ensures covers when at least one destination has no cover status', () => {
    const ensure = vi.fn().mockResolvedValue(null);
    convex.useMutation.mockReturnValue(ensure);

    renderHook(() =>
      useEnsureDestinationCovers(tripId, { destinations: [{ coverStatus: null }] } as TripDetail)
    );

    expect(ensure).toHaveBeenCalledWith({ tripId });
  });

  test('does not request covers while the trip is loading or all covers are resolved', () => {
    const ensure = vi.fn();
    convex.useMutation.mockReturnValue(ensure);

    const { rerender } = renderHook(({ trip }) => useEnsureDestinationCovers(tripId, trip), {
      initialProps: { trip: undefined as TripDetail | undefined }
    });
    rerender({ trip: { destinations: [{ coverStatus: 'ready' }] } as TripDetail });

    expect(ensure).not.toHaveBeenCalled();
  });
});
