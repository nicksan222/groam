import type { Id } from '@groam/backend/data-model';
import { Search } from '@groam/icons';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { EntityParticipationBoundary } from '@/features/trips/trip-detail/entity-participation-boundary';
import { ParticipatingResearchThreadView } from './participating-research-thread-view';

export function ResearchThreadView({
  researchId,
  tripId
}: {
  researchId: Id<'discussions'>;
  tripId: Id<'trips'>;
}) {
  return (
    <EntityParticipationBoundary
      reference={researchId}
      table="discussions"
      expectedTripId={tripId}
      expectedKind="research"
      loadingLabel="Opening research…"
      missing={
        <EmptyScreen
          headline="Research not found"
          description="It may have been removed, or it does not belong to this trip."
          icon={Search}
        />
      }
    >
      <ParticipatingResearchThreadView researchId={researchId} />
    </EntityParticipationBoundary>
  );
}
