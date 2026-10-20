import type { Id } from '@groam/backend/data-model';
import { FileDiff } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { EntityParticipationBoundary } from '@/features/trips/trip-detail/entity-participation-boundary';
import { Link } from '@/features/workspace/navigation/router';
import { ParticipatingIdeaDetailView } from './participating-idea-detail-view';

export function IdeaDetailView({ proposalId }: { proposalId: Id<'tripProposals'> }) {
  return (
    <EntityParticipationBoundary
      reference={proposalId}
      table="tripProposals"
      loadingLabel="Loading idea…"
      missing={
        <EmptyScreen
          buttonRaw={
            <Button asChild variant="outline">
              <Link to="/ideas">Back to ideas</Link>
            </Button>
          }
          description="It may have been removed, or you do not have access to this trip."
          headline="Idea not found"
          icon={FileDiff}
        />
      }
    >
      <ParticipatingIdeaDetailView proposalId={proposalId} />
    </EntityParticipationBoundary>
  );
}
