import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useTripResearches } from './use-trip-researches';

const convex = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));

beforeEach(() => vi.clearAllMocks());

test('queries researches of the trip and reports loading', async () => {
  convex.useQuery.mockReturnValue(undefined);
  const { result } = await renderHook(() => useTripResearches('t1' as Id<'trips'>));
  expect(result.current).toMatchObject({ isLoading: true, researches: [] });
  expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), {
    kind: 'research',
    tripId: 't1'
  });
});

test('skips without a trip', async () => {
  convex.useQuery.mockReturnValue(undefined);
  const { result } = await renderHook(() => useTripResearches(undefined));
  expect(result.current.isLoading).toBe(false);
  expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
});
