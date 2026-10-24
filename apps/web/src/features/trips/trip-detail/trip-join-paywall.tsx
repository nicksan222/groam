import { Heading } from '@groam/ui/components/heading';
import Shell from '@groam/ui/components/shell/client';
import { TripPaymentsPanel } from '@/features/trips/trip-people/trip-payments-panel';
import { testIds } from '@/lib/test-ids';
import type { LoadedTrip } from './trip-detail-types';
import { TripPageShell } from './trip-page-shell';

export function TripJoinPaywall({ trip }: { trip: LoadedTrip }) {
  return (
    <TripPageShell
      body={
        <div className="mx-auto w-full max-w-lg space-y-4 py-2">
          <div>
            <Heading level={2} size="base">
              Join this trip
            </Heading>
            <p className="mt-2 text-sm text-muted-foreground">
              Pay €1 once to join the planning, conversations, and decisions for {trip.name}. An
              organizer can also cover your payment.
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
      }
      header={
        <Shell.Header
          meta="You are invited"
          title={trip.name}
          titleProps={{
            'data-testid': testIds.tripHeading,
            'data-trip-id': trip.id,
            'data-trip-name': trip.name
          }}
        />
      }
    />
  );
}
