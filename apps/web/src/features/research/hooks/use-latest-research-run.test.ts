import type { Id } from '@groam/backend/data-model';
import { renderHook } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { useLatestResearchRun } from './use-latest-research-run';

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock('convex/react', async (original) => ({
  ...(await original<typeof import('convex/react')>()),
  useQuery: (...args: unknown[]) => mocks.useQuery(...args)
}));

test('preserves loading, empty, and persisted report states for the research id', async () => {
  const id = 'research-1' as Id<'discussions'>;
  mocks.useQuery.mockReturnValue(undefined);
  const view = await renderHook(() => useLatestResearchRun(id));
  expect(view.result.current).toBeUndefined();
  expect(mocks.useQuery).toHaveBeenLastCalledWith(expect.anything(), { discussionId: id });
  mocks.useQuery.mockReturnValue(null);
  await view.rerender();
  expect(view.result.current).toBeNull();
  const run = { id: 'run-1', report: 'Saved findings', status: 'complete' };
  mocks.useQuery.mockReturnValue(run);
  await view.rerender();
  expect(view.result.current).toEqual(run);
});
