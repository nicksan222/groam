import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useTripRecord } from './use-trip-record';

const convex = vi.hoisted(() => ({
  useQuery: vi.fn()
}));

vi.mock('convex/react', () => convex);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTripRecord', () => {
  test('skips the query when trip id is missing', () => {
    convex.useQuery.mockReturnValue(undefined);
    renderHook(() => useTripRecord(undefined));
    expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
  });

  test('loads the trip when an id is provided', () => {
    const trip = { id: 'trip-1', name: 'Portugal' };
    convex.useQuery.mockReturnValue(trip);
    const { result } = renderHook(() => useTripRecord('trip-1' as Id<'trips'>));
    expect(result.current).toEqual(trip);
    expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), {
      tripId: 'trip-1'
    });
  });
});
