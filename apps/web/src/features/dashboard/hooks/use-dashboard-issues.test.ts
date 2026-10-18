import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import {
  assignedToViewer,
  dashboardIssue
} from '@/features/dashboard/testing/dashboard-activity-fixtures';
import { useDashboardIssues } from './use-dashboard-issues';

const issuesSource = vi.hoisted(() => ({ useWorkspaceIssues: vi.fn() }));
const workspace = vi.hoisted(() => ({ useWorkspace: vi.fn() }));
vi.mock('@/features/issues/hooks/use-workspace-issues', () => issuesSource);
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => workspace);

beforeEach(() => {
  workspace.useWorkspace.mockReturnValue({ session: { user: { id: 'user-1' } } });
  issuesSource.useWorkspaceIssues.mockReturnValue({ isLoading: false, issues: [] });
});

test('separates the viewer’s issues from the rest of the open work', async () => {
  issuesSource.useWorkspaceIssues.mockReturnValue({
    isLoading: false,
    issues: [
      dashboardIssue({ assignee: assignedToViewer, id: 'mine' as never }),
      dashboardIssue({ id: 'other' as never })
    ]
  });
  const { result } = await renderHook(() => useDashboardIssues());
  expect(result.current.assigned.map((issue) => issue.id)).toEqual(['mine']);
  expect(result.current.open.map((issue) => issue.id)).toEqual(['other']);
});

test('reports loading', async () => {
  issuesSource.useWorkspaceIssues.mockReturnValue({ isLoading: true, issues: [] });
  const { result } = await renderHook(() => useDashboardIssues());
  expect(result.current).toMatchObject({ assigned: [], isLoading: true, open: [] });
});
