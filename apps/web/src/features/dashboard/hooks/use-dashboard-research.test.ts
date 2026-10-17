import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { dashboardResearch } from '@/features/dashboard/testing/dashboard-activity-fixtures';
import { useDashboardResearch } from './use-dashboard-research';

const convex = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  ...convex
}));

beforeEach(() => {
  convex.useQuery.mockReturnValue([]);
});

test('is loading until the query resolves', async () => {
  convex.useQuery.mockReturnValue(undefined);
  const { result } = await renderHook(() => useDashboardResearch());
  expect(result.current).toEqual({ isLoading: true, research: [] });
});

test('caps research at 4', async () => {
  convex.useQuery.mockReturnValue(
    Array.from({ length: 6 }, (_, index) => dashboardResearch({ id: `r${index}` as never }))
  );
  const { result } = await renderHook(() => useDashboardResearch());
  expect(result.current.research).toHaveLength(4);
});
