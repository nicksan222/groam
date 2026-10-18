import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import { Button } from '@groam/ui/components/button';
import { useNavigate } from '@tanstack/react-router';
import { MessageSquareText, Plus } from 'lucide-react';
import { CreateIssueDialog } from '@/features/issues/issue-list/create-issue-dialog';
import { IssueList } from '@/features/issues/issue-list/issue-list';
import { useTripIssues } from '@/features/trips/hooks/use-trip-issues';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripSectionPanel } from '@/features/trips/trip-detail/trip-section-panel';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { IssueStatusFilter } from '@/types/issues';

const emptyMessages: Record<IssueStatusFilter, string> = {
  all: 'There are no issues in this trip.',
  closed: 'There are no closed issues in this trip.',
  in_progress: 'Nothing is in progress in this trip.',
  open: 'There are no open issues in this trip.',
  wont_do: "Nothing is marked won't do in this trip."
};

export function TripIssuesPanel({ trip }: { trip: TripDetail }) {
  const { issues } = useTripIssues(trip.id);
  const createDialog = useOpenState(false);
  const navigate = useNavigate();
  const openCount = issues?.filter((issue) => !isResolved(issue.status)).length ?? 0;

  return (
    <TripSectionPanel
      badge={`${openCount} open`}
      description="Decisions and blockers the group still has to settle."
      icon={MessageSquareText}
      title="Issues"
      trailing={
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild data-testid={testIds.issuesAll} size="sm" variant="outline">
            <Link to="/issues">All issues</Link>
          </Button>
          {trip.archivedAt !== null ? null : (
            <Button data-testid={testIds.newIssue} onClick={createDialog.openPanel} size="sm">
              <Plus />
              New issue
            </Button>
          )}
        </div>
      }
    >
      <CreateIssueDialog
        onClose={createDialog.closePanel}
        onCreated={(issueId) => {
          createDialog.closePanel();
          void navigate({ params: { issueId }, to: '/issues/$issueId' });
        }}
        open={createDialog.open}
        tripId={trip.id}
      />

      <IssueList
        emptyFilterMessage={(filter) => emptyMessages[filter]}
        issues={issues}
        showTripName={false}
      />
    </TripSectionPanel>
  );
}
