import type { Id } from '@groam/backend/data-model';
import type { TripSection } from '@/features/trips/trip-sections';
import { TripParticipatingDetailView } from './trip-participating-detail-view';
import { TripParticipationBoundary } from './trip-participation-boundary';

export function TripDetailView(props: {
  addDestinationOpen: boolean;
  day?: number;
  section: TripSection;
  tripId: Id<'trips'>;
  tripReference?: string;
}) {
  return (
    <TripParticipationBoundary tripId={props.tripId}>
      {(tripState) => <TripParticipatingDetailView {...props} tripState={tripState} />}
    </TripParticipationBoundary>
  );
}
