import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { useTripAgentContext } from '@/features/trips/hooks/use-trip-agent-context';
import { useTripPayments } from '@/features/trips/hooks/use-trip-payments';
import { useTripTravelers } from '@/features/trips/hooks/use-trip-travelers';
import { TripPaymentsPanel } from '@/features/trips/trip-travelers/trip-payments-panel';
import { TripTravelersSheet } from '@/features/trips/trip-travelers/trip-travelers-sheet';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { testIds } from '@/lib/test-ids';
import type { LoadedTrip, TripState } from './trip-detail-types';
import { TripHeader } from './trip-header';
import { useTripCover } from './use-trip-cover';

export function TripJoinPaywall({
  trip,
  tripState,
  viewerId
}: {
  trip: LoadedTrip;
  tripState: TripState;
  viewerId: string;
}) {
  const roster = useOpenState(false);
  const sharedTripId = trip.proposal?.sourceTripId ?? trip.id;
  const { travelers } = useTripTravelers(sharedTripId);
  const cover = useTripCover(trip, tripState.retryCover);
  const { archived } = useTripPayments(sharedTripId);
  // Clear the prior trip context without subscribing to protected planning data.
  useTripAgentContext(undefined, 'board');
  return (
    <Shell className="trip-page-shell">
      <Shell.BannerLayout className="trip-page-ready">
        <TripHeader
          actions={
            <Button onClick={roster.openPanel} variant="outline">
              Travelers
            </Button>
          }
          chips={<span className="text-xs text-muted-foreground">Invited</span>}
          cover={cover}
          dataTripId={trip.id}
          dataTripName={trip.name}
          testId={testIds.tripHeading}
          title={trip.name}
        />
        <div className="mx-auto w-full max-w-lg space-y-4 px-6 py-8">
          <div>
            <h2 className="text-lg font-semibold">Join this trip</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Pay €1 once to join the planning, conversations, and decisions for {trip.name}. An
              organizer can also cover your payment from Travelers.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Already paid? Your access opens automatically when payment is confirmed.
            </p>
          </div>
          <TripPaymentsPanel
            archived={archived}
            canManageOthers={trip.role === 'organizer'}
            travelers={travelers}
            tripId={sharedTripId}
            viewerId={viewerId}
          />
        </div>
      </Shell.BannerLayout>
      <TripTravelersSheet
        archived={archived}
        canManageOthers={trip.role === 'organizer'}
        onOpenChange={roster.setOpen}
        open={roster.open}
        tripId={sharedTripId}
        tripName={trip.name}
      />
    </Shell>
  );
}
