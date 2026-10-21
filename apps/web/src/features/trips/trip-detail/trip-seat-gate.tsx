import type { Id } from '@groam/backend/data-model';
import { PageLoading } from '@groam/ui/components/page-loading';
import type { ReactNode } from 'react';
import { useTrip } from '@/features/trips/hooks/use-trips';
import { TripJoinPaywall } from './trip-join-paywall';

/**
 * Trip pages outside TripDetailView: members without a seat see the paywall, and the page's own
 * trip subscriptions never mount for them. A missing trip falls through to the page's not-found.
 */
export function TripSeatGate({
  children,
  loadingLabel,
  tripId
}: {
  children: ReactNode;
  loadingLabel: string;
  tripId: Id<'trips'>;
}) {
  const tripState = useTrip(tripId);
  const { trip } = tripState;
  if (tripState.exists === undefined) return <PageLoading label={loadingLabel} />;
  if (trip && !trip.canParticipate) return <TripJoinPaywall trip={trip} tripState={tripState} />;
  return children;
}
