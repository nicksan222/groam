import { CalendarDays } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripSectionPanel } from '@/features/trips/trip-detail/trip-section-panel';
import { budgetBadge } from './trip-budget-label';
import { TripPackingList } from './trip-packing-list';

/**
 * The read-only plan under the same section header as the trip's issues and ideas, with the
 * budget in its badge, then the itinerary and packing.
 */
export function TripReadingOverview({
  itinerary,
  trip
}: {
  itinerary: ReactNode;
  trip: TripDetail;
}) {
  return (
    <TripSectionPanel
      badge={budgetBadge(trip)}
      description="The plan the group agreed on: every day, the route, and what to pack."
      icon={CalendarDays}
      stack="page"
      title="Overview"
    >
      {itinerary}
      <TripPackingList trip={trip} />
    </TripSectionPanel>
  );
}
