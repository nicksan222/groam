import Shell from '@groam/ui/components/shell/client';
import { useDashboardRuns } from '@/features/dashboard/hooks/use-dashboard-runs';
import { testIds } from '@/lib/test-ids';
import { AgentRunRow } from './agent-run-row';
import { DashboardSectionHeading } from './dashboard-section-heading';

/** Zone B: what agents are doing now and just did. */
export function AgentActivitySection() {
  const { activity, isLoading } = useDashboardRuns();
  if (isLoading || activity.length === 0) return null;

  return (
    <Shell.Section
      aria-labelledby="dashboard-agent-activity-heading"
      data-testid={testIds.dashboardAgentActivity}
      stack="sm"
    >
      <DashboardSectionHeading
        description="Running and recent agent work across the group."
        id="dashboard-agent-activity-heading"
        seeAll={{ label: 'See all', to: '/agents' }}
        title="Agent activity"
      />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {activity.map((run) => (
          <AgentRunRow key={run.id} run={run} testId={testIds.dashboardAgentActivityRow} />
        ))}
      </div>
    </Shell.Section>
  );
}
