import { useMemo } from 'react';
import { useWorkspaceAgentRuns } from '@/features/agents/hooks/use-workspace-agent-runs';
import { selectActivityRuns, selectWaitingRuns } from './dashboard-activity-model';

/** Agent runs the home shows: ones waiting on the group, and live/recent activity. */
export function useDashboardRuns() {
  const { isLoading, runs } = useWorkspaceAgentRuns();
  return useMemo(
    () => ({ activity: selectActivityRuns(runs), isLoading, waiting: selectWaitingRuns(runs) }),
    [isLoading, runs]
  );
}
