import type { Id } from '@groam/backend/data-model';
import { TripParticipationBoundary } from '@/features/trips/trip-detail/trip-participation-boundary';
import { ParticipatingResearchThreadView } from './participating-research-thread-view';

export function ResearchThreadView({
  researchId,
  tripId
}: {
  researchId: Id<'discussions'>;
  tripId: Id<'trips'>;
}) {
  return (
    <TripParticipationBoundary tripId={tripId}>
      {() => <ParticipatingResearchThreadView researchId={researchId} />}
    </TripParticipationBoundary>
  );
}
