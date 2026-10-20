import type { Id } from '@groam/backend/data-model';
import { TripParticipationBoundary } from '@/features/trips/trip-detail/trip-participation-boundary';
import type { IdeaCloneView as CloneView } from './idea-sections';
import { ParticipatingIdeaCloneView } from './participating-idea-clone-view';

export function IdeaCloneView(props: {
  addDestinationOpen: boolean;
  proposalId: Id<'tripProposals'>;
  sharedTripId: Id<'trips'>;
  view: CloneView;
}) {
  return (
    <TripParticipationBoundary tripId={props.sharedTripId}>
      {() => <ParticipatingIdeaCloneView {...props} />}
    </TripParticipationBoundary>
  );
}
