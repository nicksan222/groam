import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useLinkedResearches } from './use-linked-researches';

const state = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...state
}));
vi.mock('./use-trip-researches', () => ({
  useTripResearches: () => ({ isLoading: false, researches: [{ id: 'r1' }, { id: 'r2' }] })
}));

beforeEach(() => vi.clearAllMocks());

test('splits trip researches into linked and available', async () => {
  state.useQuery.mockReturnValue([{ id: 'r1' }]);
  const { result } = await renderHook(() =>
    useLinkedResearches('t1' as Id<'trips'>, { id: 'i1', kind: 'issue' })
  );
  expect(result.current.linked).toEqual([{ id: 'r1' }]);
  expect(result.current.available).toEqual([{ id: 'r2' }]);
  expect(state.useQuery).toHaveBeenCalledWith(expect.anything(), {
    target: { issueId: 'i1', kind: 'issue' }
  });
});

test('is loading and skips the link query without a trip', async () => {
  state.useQuery.mockReturnValue(undefined);
  const { result } = await renderHook(() =>
    useLinkedResearches(undefined, { id: 'i1', kind: 'idea' })
  );
  expect(result.current.isLoading).toBe(true);
  expect(result.current.linked).toEqual([]);
  expect(result.current.available).toHaveLength(2);
  expect(state.useQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
});

test('is loading while the linked rows are unresolved', async () => {
  state.useQuery.mockReturnValue(undefined);
  const { result } = await renderHook(() =>
    useLinkedResearches('t1' as Id<'trips'>, { id: 's1', kind: 'stay' })
  );
  expect(result.current.isLoading).toBe(true);
  expect(state.useQuery).toHaveBeenCalledWith(expect.anything(), {
    target: { kind: 'tripTarget', target: { id: 's1', type: 'stay' } }
  });
});
