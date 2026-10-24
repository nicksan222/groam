import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { useTripDiscussions } from './use-trip-discussions';

const all = vi.hoisted(() => vi.fn());

vi.mock('./use-discussions', () => ({ useDiscussions: all }));

describe('useTripDiscussions', () => {
  test('keeps only the chats linked to the trip', async () => {
    all.mockReturnValue({
      discussions: [{ tripId: 'trip-1' }, { tripId: 'other' }, { tripId: null }],
      isLoading: false
    });
    const { result } = await renderHook(() => useTripDiscussions('trip-1' as Id<'trips'>));
    expect(result.current.discussions).toEqual([{ tripId: 'trip-1' }]);
    expect(all).toHaveBeenCalledWith(undefined);
  });

  test('skips the subscription without a trip', async () => {
    all.mockReturnValue({ discussions: [], isLoading: true });
    const { result } = await renderHook(() => useTripDiscussions(undefined));
    expect(all).toHaveBeenCalledWith('skip');
    expect(result.current).toEqual({ discussions: [], isLoading: false });
  });
});
