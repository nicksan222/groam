import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useTripPersonalPacking } from './use-trip-personal-packing';

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
const itemId = 'mine-1' as Id<'tripPersonalPackingItems'>;

/** useMutation is called add, update, remove, in that order, every render. */
function mockMutations(add: unknown, update: unknown, remove: unknown) {
  const order = [add, update, remove];
  let call = 0;
  convex.useMutation.mockImplementation(() => order[call++ % order.length]);
}

beforeEach(() => {
  vi.clearAllMocks();
  convex.useQuery.mockReturnValue([{ id: itemId, label: 'Charger', packed: false }]);
});

describe('useTripPersonalPacking', () => {
  test('adds, ticks, and removes items for the trip', async () => {
    const add = vi.fn().mockResolvedValue(null);
    const update = vi.fn().mockResolvedValue(null);
    const remove = vi.fn().mockResolvedValue(null);
    mockMutations(add, update, remove);
    const { result } = await renderHook(() => useTripPersonalPacking(tripId));

    expect(result.current.items).toHaveLength(1);
    await act(async () => {
      expect(await result.current.add('Passport')).toBe(true);
      expect(await result.current.setPacked(itemId, true)).toBe(true);
      expect(await result.current.remove({ id: itemId, label: 'Charger', packed: false })).toBe(
        true
      );
    });

    expect(add).toHaveBeenCalledWith({ label: 'Passport', tripId });
    expect(update).toHaveBeenCalledWith({ itemId, packed: true, tripId });
    expect(remove).toHaveBeenCalledWith({ itemId, tripId });
  });

  test('removing offers Undo that re-adds the item and its tick', async () => {
    const add = vi.fn().mockResolvedValue({ id: 'mine-2', label: 'Charger', packed: false });
    const update = vi.fn().mockResolvedValue(null);
    mockMutations(add, update, vi.fn().mockResolvedValue(null));
    const { result } = await renderHook(() => useTripPersonalPacking(tripId));
    await act(async () => {
      await result.current.remove({ id: itemId, label: 'Charger', packed: true });
    });
    const options = notifications.mock.calls[0]?.[1] as { action: { onClick: () => void } };
    await act(async () => {
      options.action.onClick();
    });
    await vi.waitFor(() =>
      expect(update).toHaveBeenCalledWith({ itemId: 'mine-2', packed: true, tripId })
    );
    expect(add).toHaveBeenCalledWith({ label: 'Charger', tripId });
  });

  test('toasts a failed write', async () => {
    mockMutations(vi.fn().mockRejectedValue(new Error('Archived')), vi.fn(), vi.fn());
    const { result } = await renderHook(() => useTripPersonalPacking(tripId));
    await act(async () => {
      expect(await result.current.add('Passport')).toBe(false);
    });
    expect(notifications.error).toHaveBeenCalledWith('Archived');
  });

  test('skips loading without a trip', async () => {
    mockMutations(vi.fn(), vi.fn(), vi.fn());
    convex.useQuery.mockReturnValue(undefined);
    const { result } = await renderHook(() => useTripPersonalPacking(undefined));
    expect(convex.useQuery).toHaveBeenLastCalledWith(expect.anything(), 'skip');
    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);
  });
});
