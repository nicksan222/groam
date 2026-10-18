import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import { buildDashboardContext } from '@/features/dashboard/hooks/dashboard-agent-context';
import type { DashboardBuckets } from '@/features/dashboard/hooks/dashboard-model';
import { useDashboardIssues } from '@/features/dashboard/hooks/use-dashboard-issues';
import { useDashboardPolls } from '@/features/dashboard/hooks/use-dashboard-polls';
import { useDashboardResearch } from '@/features/dashboard/hooks/use-dashboard-research';
import { useDashboardRuns } from '@/features/dashboard/hooks/use-dashboard-runs';

/** Registers the ready home's context, including the agent, issue, poll and research data. */
export function DashboardAgentContext({
  buckets,
  groupName
}: {
  buckets: DashboardBuckets;
  groupName: string;
}) {
  const issues = useDashboardIssues();
  const polls = useDashboardPolls();
  const research = useDashboardResearch();
  const runs = useDashboardRuns();
  useSetAgentContext(
    buildDashboardContext({ activity: { issues, polls, research, runs }, buckets, groupName })
  );
  return null;
}
