import type { ReactNode } from 'react';
import { ideaOverviewTitle } from '@/features/ideas/idea-glossary';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripSectionPanel } from '@/features/trips/trip-detail/trip-section-panel';

/**
 * The read-only plan day by day, then the itinerary; the budget is on the page header's facts line. `lead` sits
 * between them (Plan's "your turn" strip). An idea's working copy reads as the whole trip it would become once applied.
 */
export function TripReadingOverview({
  itinerary,
  lead,
  trip
}: {
  itinerary: ReactNode;
  lead?: ReactNode;
  trip: TripDetail;
}) {
  const isIdea = Boolean(trip.proposal);
  return (
    <TripSectionPanel title={isIdea ? ideaOverviewTitle : 'Plan'}>
      {lead}
      {itinerary}
    </TripSectionPanel>
  );
}
