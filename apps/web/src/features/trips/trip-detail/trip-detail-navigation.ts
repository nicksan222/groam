import type { Id } from '@groam/backend/data-model';
import type { useNavigate } from '@tanstack/react-router';
import type { useStartIdeaFlow } from '@/features/trips/hooks/use-start-idea-flow';
import type { TripSection } from '@/features/trips/trip-sections';
import type { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';
import type { LoadedTrip, TripNavigation } from './trip-detail-types';

export function createTripNavigation({
  confirm,
  ideaFlow,
  navigate,
  trip,
  tripId
}: {
  confirm: ReturnType<typeof useConfirm>;
  ideaFlow: ReturnType<typeof useStartIdeaFlow>;
  navigate: ReturnType<typeof useNavigate>;
  trip: LoadedTrip | undefined;
  tripId: Id<'trips'>;
}): TripNavigation {
  const openSection = (section: TripSection) =>
    void navigate({ params: { section, tripId }, search: {}, to: '/trips/$tripId/$section' });
  const closeAddDestination = () =>
    void navigate({
      params: { section: 'itinerary', tripId },
      replace: true,
      search: {},
      to: '/trips/$tripId/$section'
    });
  const openAddDestination = () => {
    if (!trip) return;
    if (!trip.permissions.canEdit && trip.permissions.canPropose)
      return ideaFlow.start({ addDestination: true, section: 'itinerary' });
    void continueAddDestination({ confirm, navigate, trip, tripId });
  };
  return { closeAddDestination, openAddDestination, openSection };
}

async function continueAddDestination({
  confirm,
  navigate,
  trip,
  tripId
}: {
  confirm: ReturnType<typeof useConfirm>;
  navigate: ReturnType<typeof useNavigate>;
  trip: LoadedTrip;
  tripId: Id<'trips'>;
}) {
  if (
    trip.departureTransfer &&
    !(await confirm(
      'Clear return travel?',
      'Adding another stop will clear the existing return travel details.'
    ))
  )
    return;
  void navigate({
    params: { section: 'itinerary', tripId },
    search: { addDestination: true },
    to: '/trips/$tripId/$section'
  });
}
