import Shell from '@groam/ui/components/shell/client';
import { useDashboardResearch } from '@/features/dashboard/hooks/use-dashboard-research';
import { testIds } from '@/lib/test-ids';
import { DashboardSectionHeading } from './dashboard-section-heading';
import { ResearchRow } from './research-row';

/** Zone B: recent research threads across the group's trips. */
export function ResearchSection() {
  const { isLoading, research } = useDashboardResearch();
  if (isLoading || research.length === 0) return null;

  return (
    <Shell.Section
      aria-labelledby="dashboard-research-heading"
      data-testid={testIds.dashboardResearch}
      stack="sm"
    >
      <DashboardSectionHeading
        description="Questions the group is digging into."
        id="dashboard-research-heading"
        title="Research"
      />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {research.map((item) => (
          <ResearchRow key={item.id} research={item} />
        ))}
      </div>
    </Shell.Section>
  );
}
