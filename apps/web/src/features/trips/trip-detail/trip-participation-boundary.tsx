import type { Id } from '@groam/backend/data-model';
import { PageLoading } from '@groam/ui/components/page-loading';
import type { ReactNode } from 'react';
import { useTripPayments } from '@/features/trips/hooks/use-trip-payments';
import { useTrip } from '@/features/trips/hooks/use-trips';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import type { TripState } from './trip-detail-types';
import { TripJoinPaywall } from './trip-join-paywall';
import { TripNotFound } from './trip-not-found';

export function TripParticipationBoundary({
  children,
  tripId
}: {
  children: (tripState: TripState) => ReactNode;
  tripId: Id<'trips'>;
}) {
  const tripState = useTrip(tripId);
  const trip = tripState.trip;
  const { session } = useWorkspace();
  // Working copies share the source trip's payment requirement.
  const payments = useTripPayments(trip?.proposal?.sourceTripId ?? trip?.id);
  if (tripState.exists === false) return <TripNotFound />;
  if (!trip || payments.isLoading) return <PageLoading label="Loading trip…" />;
  const traveler = payments.travelers.find((member) => member.userId === session.user.id);
  const canParticipate = !payments.enabled || traveler?.free || traveler?.paid;
  if (!canParticipate) {
    return <TripJoinPaywall trip={trip} tripState={tripState} viewerId={session.user.id} />;
  }
  return children(tripState);
}
