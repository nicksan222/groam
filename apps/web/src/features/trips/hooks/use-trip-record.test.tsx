import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useTripRecord } from './use-trip-record';

const convex = vi.hoisted(() => ({
  useQuery: vi.fn()
}));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTripRecord', () => {
  test('skips the query when trip id is missing', async () => {
    convex.useQuery.mockReturnValue(undefined);
    await renderHook(() => useTripRecord(undefined));
    expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
  });

  test('loads the trip when an id is provided', async () => {
    const trip = { id: 'trip-1', name: 'Portugal' };
    convex.useQuery.mockReturnValue(trip);
    const { result } = await renderHook(() => useTripRecord('trip-1' as Id<'trips'>));
    expect(result.current).toEqual(trip);
    expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), {
      tripId: 'trip-1'
    });
  });
});
