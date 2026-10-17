import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useTripPacking } from './use-trip-packing';

const convex = vi.hoisted(() => ({ useMutation: vi.fn(), useQuery: vi.fn() }));
const notifications = vi.hoisted(() =>
  Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() })
);

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

const tripId = 'trip-1' as Id<'trips'>;
const itemId = 'packing-1' as Id<'tripPackingItems'>;
const item = {
  bringers: [{ count: 2, image: null, name: 'Ana', userId: 'ana' }],
  brought: 2,
  id: itemId,
  label: 'Tent',
  quantity: 3
};

/** useMutation is called add, update, remove, bring, in that order, every render. */
function mockMutations(
  writes: Record<'add' | 'bring' | 'remove' | 'update', ReturnType<typeof vi.fn>>
) {
  const order = [writes.add, writes.update, writes.remove, writes.bring];
  let call = 0;
  convex.useMutation.mockImplementation(() => order[call++ % order.length]);
}

const writes = () => ({
  add: vi.fn().mockResolvedValue(null),
  bring: vi.fn().mockResolvedValue(null),
  remove: vi.fn().mockResolvedValue(null),
  update: vi.fn().mockResolvedValue(null)
});

beforeEach(() => {
  vi.clearAllMocks();
  convex.useQuery.mockReturnValue([]);
});

describe('useTripPacking', () => {
  test('sends group gear writes with the trip and resolves true', async () => {
    const mutations = writes();
    mockMutations(mutations);
    const { result } = await renderHook(() => useTripPacking(tripId));

    await act(async () => {
      expect(await result.current.add('Hair dryer', 3)).toBe(true);
      expect(await result.current.update(itemId, { quantity: 2 })).toBe(true);
      expect(await result.current.bring(itemId, 'user-1', 1)).toBe(true);
      expect(await result.current.remove(item)).toBe(true);
    });

    expect(mutations.add).toHaveBeenCalledWith({ label: 'Hair dryer', quantity: 3, tripId });
    expect(mutations.update).toHaveBeenCalledWith({ itemId, quantity: 2, tripId });
    expect(mutations.bring).toHaveBeenCalledWith({ count: 1, itemId, tripId, userId: 'user-1' });
    expect(mutations.remove).toHaveBeenCalledWith({ itemId, tripId });
  });

  test('removing an item offers Undo that restores it and its bringers', async () => {
    const mutations = writes();
    mutations.add.mockResolvedValue({ id: 'packing-2', label: 'Tent', quantity: 3 });
    mockMutations(mutations);
    const { result } = await renderHook(() => useTripPacking(tripId));
    await act(async () => {
      await result.current.remove(item);
    });
    const options = notifications.mock.calls[0]?.[1] as { action: { onClick: () => void } };
    expect(notifications.mock.calls[0]?.[0]).toBe('Removed Tent');
    await act(async () => {
      options.action.onClick();
    });
    await vi.waitFor(() =>
      expect(mutations.bring).toHaveBeenCalledWith({
        count: 2,
        itemId: 'packing-2',
        tripId,
        userId: 'ana'
      })
    );
    expect(mutations.add).toHaveBeenCalledWith({ label: 'Tent', quantity: 3, tripId });
  });

  test('dropping a bringer to zero offers Undo back to their count', async () => {
    const mutations = writes();
    mockMutations(mutations);
    const { result } = await renderHook(() => useTripPacking(tripId));
    await act(async () => {
      await result.current.bring(itemId, 'ana', 0, 1);
    });
    const options = notifications.mock.calls[0]?.[1] as { action: { onClick: () => void } };
    await act(async () => {
      options.action.onClick();
    });
    await vi.waitFor(() =>
      expect(mutations.bring).toHaveBeenLastCalledWith({
        count: 1,
        itemId,
        tripId,
        userId: 'ana'
      })
    );
  });

  test('toasts a failed write and resolves false', async () => {
    const mutations = writes();
    mutations.add.mockRejectedValue(new Error('Start an idea'));
    mockMutations(mutations);
    const { result } = await renderHook(() => useTripPacking(tripId));

    await act(async () => {
      expect(await result.current.add('Hair dryer', 1)).toBe(false);
    });
    expect(notifications.error).toHaveBeenCalledWith('Start an idea');
  });

  test('skips the query and writes nothing without a trip', async () => {
    const mutations = writes();
    mockMutations(mutations);
    convex.useQuery.mockReturnValue(undefined);
    const { result } = await renderHook(() => useTripPacking(undefined));

    expect(convex.useQuery).toHaveBeenLastCalledWith(expect.anything(), 'skip');
    expect(result.current.isLoading).toBe(true);
    await act(async () => {
      expect(await result.current.remove(item)).toBe(false);
    });
    expect(mutations.remove).not.toHaveBeenCalled();
  });
});
