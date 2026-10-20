import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { useDashboardResearch } from '@/features/dashboard/hooks/use-dashboard-research';
import { testIds } from '@/lib/test-ids';
import { DashboardSectionHeading } from './dashboard-section-heading';
import { ResearchRow } from './research-row';

/** Zone B: recent research threads across the group's trips. */
export function ResearchSection() {
  const { canLoadMore, isLoadingMore, loadMore, isLoading, research } = useDashboardResearch();
  if (isLoading || (research.length === 0 && !canLoadMore && !isLoadingMore)) return null;

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
      {research.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {research.map((item) => (
            <ResearchRow key={item.id} research={item} />
          ))}
        </div>
      ) : null}
      {canLoadMore || isLoadingMore ? (
        <Button disabled={isLoadingMore} onClick={loadMore} size="sm" variant="outline">
          {isLoadingMore ? 'Loading research…' : 'Load more research'}
        </Button>
      ) : null}
    </Shell.Section>
  );
}
