import Shell from '@groam/ui/components/shell/client';
import type { ReactNode } from 'react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { OverviewProperties } from './overview-properties';
import { TripArchiveButton } from './trip-archive-button';
import { TripCalendarExportButton } from './trip-calendar-export-button';
import { TripPackingList } from './trip-packing-list';

export function TripReadingOverview({
  itinerary,
  trip,
  tripState
}: {
  itinerary: ReactNode;
  trip: TripDetail;
  tripState: TripState;
}) {
  return (
    <Shell.Stack stack="page">
      <section aria-label="Trip at a glance" className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {trip.proposal ? 'Idea preview' : 'Your trip at a glance'}
        </h2>
        <OverviewProperties compact trip={trip} />
      </section>
      {itinerary}
      <Shell.TwoColumns>
        <Shell.LeftColumn>
          <TripPackingList trip={trip} />
        </Shell.LeftColumn>
        <Shell.RightColumn>
          {!trip.proposal ? (
            <Shell.Card stack="md" variant="panel">
              <h2 className="text-sm font-semibold">Travel essentials</h2>
              <TripCalendarExportButton trip={trip} />
              <TripArchiveButton trip={trip} tripState={tripState} />
            </Shell.Card>
          ) : null}
        </Shell.RightColumn>
      </Shell.TwoColumns>
    </Shell.Stack>
  );
}
