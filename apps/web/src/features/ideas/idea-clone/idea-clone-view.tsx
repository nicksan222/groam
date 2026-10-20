import type { Id } from '@groam/backend/data-model';
import { FileDiff } from '@groam/icons';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { EntityParticipationBoundary } from '@/features/trips/trip-detail/entity-participation-boundary';
import type { IdeaCloneView as CloneView } from './idea-sections';
import { ParticipatingIdeaCloneView } from './participating-idea-clone-view';

export function IdeaCloneView(props: {
  addDestinationOpen: boolean;
  proposalId: Id<'tripProposals'>;
  sharedTripId: Id<'trips'>;
  view: CloneView;
}) {
  return (
    <EntityParticipationBoundary
      reference={props.proposalId}
      table="tripProposals"
      expectedTripId={props.sharedTripId}
      loadingLabel="Loading idea…"
      missing={
        <EmptyScreen
          headline="Idea not found"
          description="It may have been removed, or it does not belong to this trip."
          icon={FileDiff}
        />
      }
    >
      <ParticipatingIdeaCloneView {...props} />
    </EntityParticipationBoundary>
  );
}
