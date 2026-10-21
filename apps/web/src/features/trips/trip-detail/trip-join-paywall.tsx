import Shell from '@groam/ui/components/shell/client';
import { TripPaymentsPanel } from '@/features/trips/trip-travelers/trip-payments-panel';
import { testIds } from '@/lib/test-ids';
import type { LoadedTrip, TripState } from './trip-detail-types';
import { TripHeader } from './trip-header';
import { useTripCover } from './use-trip-cover';

export function TripJoinPaywall({ trip, tripState }: { trip: LoadedTrip; tripState: TripState }) {
  const cover = useTripCover(trip, tripState.retryCover);
  return (
    <Shell className="trip-page-shell">
      <Shell.BannerLayout className="trip-page-ready">
        <TripHeader
          actions={null}
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
            canManageOthers={trip.role === 'organizer'}
            tripId={trip.proposal?.sourceTripId ?? trip.id}
          />
        </div>
      </Shell.BannerLayout>
    </Shell>
  );
}
