import Shell from '@groam/ui/components/shell/client';
import { useDashboardRuns } from '@/features/dashboard/hooks/use-dashboard-runs';
import { testIds } from '@/lib/test-ids';
import { AgentRunRow } from './agent-run-row';
import { DashboardSectionHeading } from './dashboard-section-heading';

/** Zone A: agent runs suspended on the group for input or approval. */
export function AgentWaitsSection() {
  const { isLoading, waiting } = useDashboardRuns();
  if (isLoading || waiting.length === 0) return null;

  return (
    <Shell.Section
      aria-labelledby="dashboard-agent-waits-heading"
      data-testid={testIds.dashboardAgentWaits}
      stack="sm"
    >
      <DashboardSectionHeading
        description="Agents paused until someone answers or approves."
        id="dashboard-agent-waits-heading"
        title="Agents waiting on you"
      />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {waiting.map((run) => (
          <AgentRunRow key={run.id} run={run} testId={testIds.dashboardAgentWaitsRow} />
        ))}
      </div>
    </Shell.Section>
  );
}
