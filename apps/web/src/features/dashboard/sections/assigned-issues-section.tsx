import Shell from '@groam/ui/components/shell/client';
import { useDashboardIssues } from '@/features/dashboard/hooks/use-dashboard-issues';
import { testIds } from '@/lib/test-ids';
import { DashboardSectionHeading } from './dashboard-section-heading';
import { IssueRow } from './issue-row';

/** Zone A: active issues assigned to the viewer. */
export function AssignedIssuesSection() {
  const { assigned, isLoading } = useDashboardIssues();
  if (isLoading || assigned.length === 0) return null;

  return (
    <Shell.Section
      aria-labelledby="dashboard-assigned-issues-heading"
      data-testid={testIds.dashboardAssignedIssues}
      stack="sm"
    >
      <DashboardSectionHeading
        description="Issues assigned to you that are still open."
        id="dashboard-assigned-issues-heading"
        seeAll={{ label: 'See all', to: '/issues' }}
        title="Your issues"
      />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {assigned.map((issue) => (
          <IssueRow issue={issue} key={issue.id} testId={testIds.dashboardAssignedIssuesRow} />
        ))}
      </div>
    </Shell.Section>
  );
}
