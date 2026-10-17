import { useMemo } from 'react';
import { useWorkspaceIssues } from '@/features/issues/hooks/use-workspace-issues';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { selectAssignedIssues, selectOpenIssues } from './dashboard-activity-model';

/** Issues the home shows: the viewer's own active ones, and the rest of the open work. */
export function useDashboardIssues() {
  const { session } = useWorkspace();
  const { isLoading, issues } = useWorkspaceIssues();
  const viewerUserId = session.user.id;
  return useMemo(
    () => ({
      assigned: selectAssignedIssues(issues, viewerUserId),
      isLoading,
      open: selectOpenIssues(issues, viewerUserId)
    }),
    [isLoading, issues, viewerUserId]
  );
}
