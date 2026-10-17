import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { dashboardRun } from '@/features/dashboard/testing/dashboard-activity-fixtures';
import { useDashboardRuns } from './use-dashboard-runs';

const source = vi.hoisted(() => ({ useWorkspaceAgentRuns: vi.fn() }));
vi.mock('@/features/agents/hooks/use-workspace-agent-runs', () => source);

beforeEach(() => {
  source.useWorkspaceAgentRuns.mockReturnValue({ isLoading: false, runs: [] });
});

test('splits runs into waiting and activity', async () => {
  source.useWorkspaceAgentRuns.mockReturnValue({
    isLoading: false,
    runs: [
      dashboardRun({ id: 'w' as never, status: 'waiting' }),
      dashboardRun({ id: 'r' as never, status: 'running' })
    ]
  });
  const { result } = await renderHook(() => useDashboardRuns());
  expect(result.current.waiting.map((run) => run.id)).toEqual(['w']);
  expect(result.current.activity.map((run) => run.id)).toEqual(['r']);
  expect(result.current.isLoading).toBe(false);
});

test('reports loading with nothing selected', async () => {
  source.useWorkspaceAgentRuns.mockReturnValue({ isLoading: true, runs: [] });
  const { result } = await renderHook(() => useDashboardRuns());
  expect(result.current).toMatchObject({ activity: [], isLoading: true, waiting: [] });
});
