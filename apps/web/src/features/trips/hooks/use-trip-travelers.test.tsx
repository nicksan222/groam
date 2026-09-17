import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useTripTravelers } from './use-trip-travelers';

const convex = vi.hoisted(() => ({ useMutation: vi.fn(), useQuery: vi.fn() }));
const notifications = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock('convex/react', () => convex);
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

const tripId = 'trip-1' as Id<'trips'>;

beforeEach(() => {
  vi.clearAllMocks();
  convex.useMutation.mockReturnValue(vi.fn().mockResolvedValue(null));
});

describe('useTripTravelers', () => {
  test('counts confirmed travelers and updates another traveler', async () => {
    const set = vi.fn().mockResolvedValue(null);
    convex.useQuery.mockReturnValue([
      { status: 'going' },
      { status: 'maybe' },
      { status: 'going' }
    ]);
    convex.useMutation.mockReturnValue(set);
    const { result } = renderHook(() => useTripTravelers(tripId));

    await act(async () => {
      expect(await result.current.setStatus('maybe', 'user-2')).toBe(true);
    });

    expect(result.current.goingCount).toBe(2);
    expect(set).toHaveBeenCalledWith({ status: 'maybe', tripId, userId: 'user-2' });
  });

  test('skips the query without a trip and reports failed status changes', async () => {
    const set = vi.fn().mockRejectedValue(new Error('Read only'));
    convex.useQuery.mockReturnValue(undefined);
    convex.useMutation.mockReturnValue(set);
    const { result } = renderHook(() => useTripTravelers(undefined));

    expect(result.current.isLoading).toBe(true);
    expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
    await act(async () => {
      expect(await result.current.setStatus('going')).toBe(false);
    });
    expect(set).not.toHaveBeenCalled();

    const withTrip = renderHook(() => useTripTravelers(tripId));
    await act(async () => {
      expect(await withTrip.result.current.setStatus('not_going')).toBe(false);
    });
    expect(notifications.error).toHaveBeenCalledWith('Read only');
  });
});
