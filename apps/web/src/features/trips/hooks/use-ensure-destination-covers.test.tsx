import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useEnsureDestinationCovers } from './use-ensure-destination-covers';
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

describe('useEnsureDestinationCovers', () => {
  test('ensures covers when at least one destination has no cover status', async () => {
    const ensure = vi.fn().mockResolvedValue(null);
    convex.useMutation.mockReturnValue(ensure);

    await renderHook(() =>
      useEnsureDestinationCovers(tripId, {
        destinations: [{ coverStatus: null }],
        permissions: { canEditCover: true }
      } as TripDetail)
    );

    expect(ensure).toHaveBeenCalledWith({ tripId });
  });

  test('does not request covers while the trip is loading or all covers are resolved', async () => {
    const ensure = vi.fn();
    convex.useMutation.mockReturnValue(ensure);

    const { rerender } = await renderHook(({ trip }) => useEnsureDestinationCovers(tripId, trip), {
      initialProps: { trip: undefined as TripDetail | undefined }
    });
    await rerender({
      trip: {
        destinations: [{ coverStatus: 'ready' }],
        permissions: { canEditCover: true }
      } as TripDetail
    });

    expect(ensure).not.toHaveBeenCalled();
  });

  test.each([true, false])(
    'only shared-trip participants request automatic destination covers: canPropose=%s',
    async (canPropose) => {
      const ensure = vi.fn().mockResolvedValue(null);
      convex.useMutation.mockReturnValue(ensure);
      await renderHook(() =>
        useEnsureDestinationCovers(tripId, {
          destinations: [{ coverStatus: null }],
          permissions: { canEditCover: false, canPropose }
        } as TripDetail)
      );
      expect(ensure).toHaveBeenCalledTimes(canPropose ? 1 : 0);
    }
  );
});
