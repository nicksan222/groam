import type { Id } from '@groam/backend/data-model';
import { CircleDot } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { EntityParticipationBoundary } from '@/features/trips/trip-detail/entity-participation-boundary';
import { Link } from '@/features/workspace/navigation/router';
import { ParticipatingIssueDetailView } from './participating-issue-detail-view';

export function IssueDetailView({ issueId }: { issueId: Id<'tripIssues'> }) {
  return (
    <EntityParticipationBoundary
      reference={issueId}
      table="tripIssues"
      loadingLabel="Loading issue…"
      missing={
        <EmptyScreen
          buttonRaw={
            <Button asChild variant="outline">
              <Link to="/issues">Back to issues</Link>
            </Button>
          }
          description="It may have been removed, or you do not have access to this trip."
          headline="Issue not found"
          icon={CircleDot}
        />
      }
    >
      <ParticipatingIssueDetailView issueId={issueId} />
    </EntityParticipationBoundary>
  );
}
