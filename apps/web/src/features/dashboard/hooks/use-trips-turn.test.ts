import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useTripsTurn } from './use-trips-turn';

const convex = vi.hoisted(() => ({ useQueries: vi.fn() }));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useQueries: (...args: unknown[]) => convex.useQueries(...args)
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('reads the viewer’s turn and is undefined while it loads', async () => {
  convex.useQueries.mockReturnValue({ turn: undefined });
  const loading = await renderHook(() => useTripsTurn());
  expect(loading.result.current).toBeUndefined();
  expect(convex.useQueries).toHaveBeenLastCalledWith({
    turn: { args: {}, query: expect.anything() }
  });

  const turn = { items: [], total: 0, trips: [] };
  convex.useQueries.mockReturnValue({ turn });
  const ready = await renderHook(() => useTripsTurn());
  expect(ready.result.current).toBe(turn);
});

test('is null, not a thrown render, when the turn cannot be read', async () => {
  convex.useQueries.mockReturnValue({ turn: new Error('turn failed') });
  const { result } = await renderHook(() => useTripsTurn());
  expect(result.current).toBeNull();
});

test('asks nothing while disabled, with a stable request', async () => {
  convex.useQueries.mockReturnValue({});
  const { rerender, result } = await renderHook(() => useTripsTurn(false));
  expect(result.current).toBeUndefined();
  const [first] = convex.useQueries.mock.lastCall ?? [];
  expect(first).toEqual({});
  await rerender();
  expect(convex.useQueries.mock.lastCall?.[0]).toBe(first);
});
