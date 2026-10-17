import Shell from '@groam/ui/components/shell/client';
import { useDashboardIssues } from '@/features/dashboard/hooks/use-dashboard-issues';
import { testIds } from '@/lib/test-ids';
import { DashboardSectionHeading } from './dashboard-section-heading';
import { IssueRow } from './issue-row';

/** Zone B: open work across the group's trips, beyond what is assigned to the viewer. */
export function OpenIssuesSection() {
  const { isLoading, open } = useDashboardIssues();
  if (isLoading || open.length === 0) return null;

  return (
    <Shell.Section
      aria-labelledby="dashboard-open-issues-heading"
      data-testid={testIds.dashboardOpenIssues}
      stack="sm"
    >
      <DashboardSectionHeading
        description="What the group still has to decide or finish."
        id="dashboard-open-issues-heading"
        seeAll={{ label: 'See all', to: '/issues' }}
        title="Open issues"
      />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {open.map((issue) => (
          <IssueRow issue={issue} key={issue.id} testId={testIds.dashboardOpenIssuesRow} />
        ))}
      </div>
    </Shell.Section>
  );
}
