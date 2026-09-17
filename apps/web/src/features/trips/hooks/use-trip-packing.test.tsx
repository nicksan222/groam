import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useTripPacking } from './use-trip-packing';

const convex = vi.hoisted(() => ({ useMutation: vi.fn(), useQuery: vi.fn() }));
const notifications = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock('convex/react', () => convex);
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

const tripId = 'trip-1' as Id<'trips'>;
const itemId = 'packing-1' as Id<'tripPackingItems'>;

beforeEach(() => {
  vi.clearAllMocks();
  convex.useQuery.mockReturnValue([]);
  convex.useMutation.mockReturnValue(vi.fn().mockResolvedValue(null));
});

describe('useTripPacking', () => {
  test('adds the draft, clears it after success, and sends trip context', async () => {
    const add = vi.fn().mockResolvedValue(null);
    convex.useMutation.mockReturnValue(add);
    const { result } = renderHook(() => useTripPacking(tripId));

    act(() => result.current.setDraft('  Passport  '));
    await act(async () => {
      await result.current.add();
    });

    expect(add).toHaveBeenCalledWith({ label: '  Passport  ', tripId });
    expect(result.current.draft).toBe('');
    expect(result.current.isPending).toBe(false);
  });

  test('skips loading and reports failed updates when no trip is selected', async () => {
    const update = vi.fn().mockRejectedValue(new Error('Read only'));
    convex.useMutation.mockReturnValueOnce(vi.fn()).mockReturnValueOnce(update);
    const loaded = renderHook(() => useTripPacking(tripId));
    await act(() => loaded.result.current.toggle(itemId, true));
    expect(update).toHaveBeenCalledWith({ itemId, packed: true, tripId });
    expect(notifications.error).toHaveBeenCalledWith('Read only');

    renderHook(() => useTripPacking(undefined));
    expect(convex.useQuery).toHaveBeenLastCalledWith(expect.anything(), 'skip');
  });

  test('does not add blank drafts, reports failed adds, and removes items', async () => {
    const add = vi.fn().mockRejectedValue(new Error('Cannot add'));
    const update = vi.fn();
    const remove = vi.fn().mockResolvedValue(null);
    let mutationIndex = 0;
    convex.useMutation.mockImplementation(() => [add, update, remove][mutationIndex++ % 3]);
    convex.useQuery.mockReturnValue(undefined);
    const { result } = renderHook(() => useTripPacking(tripId));

    await act(() => result.current.add());
    expect(add).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
    act(() => result.current.setDraft('Passport'));
    await act(() => result.current.add());
    expect(notifications.error).toHaveBeenCalledWith('Cannot add');
    await act(() => result.current.remove(itemId));
    expect(remove).toHaveBeenCalledWith({ itemId, tripId });
  });

  test('reports failed removal and does nothing when an item has no trip context', async () => {
    const add = vi.fn();
    const update = vi.fn();
    const remove = vi.fn().mockRejectedValue(new Error('Cannot remove'));
    let mutationIndex = 0;
    convex.useMutation.mockImplementation(() => [add, update, remove][mutationIndex++ % 3]);
    const selected = renderHook(() => useTripPacking(tripId));
    await act(() => selected.result.current.remove(itemId));
    expect(notifications.error).toHaveBeenCalledWith('Cannot remove');

    const noTrip = renderHook(() => useTripPacking(undefined));
    await act(() => noTrip.result.current.remove(itemId));
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
