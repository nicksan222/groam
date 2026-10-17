import { CalendarDays } from 'lucide-react';
import type { ReactNode } from 'react';
import { ideaOverviewDescription, ideaOverviewTitle } from '@/features/ideas/idea-glossary';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripSectionPanel } from '@/features/trips/trip-detail/trip-section-panel';
import { budgetBadge } from './trip-budget-label';

/**
 * The read-only plan under the same section header as the trip's issues and ideas, with the
 * budget in its badge, then the itinerary. An idea's working copy reads as the whole
 * trip it would become once applied.
 */
export function TripReadingOverview({
  itinerary,
  trip
}: {
  itinerary: ReactNode;
  trip: TripDetail;
}) {
  const isIdea = Boolean(trip.proposal);
  return (
    <TripSectionPanel
      badge={budgetBadge(trip)}
      description={
        isIdea ? ideaOverviewDescription : 'The plan the group agreed on: every day and the route.'
      }
      icon={CalendarDays}
      stack="page"
      title={isIdea ? ideaOverviewTitle : 'Overview'}
    >
      {itinerary}
    </TripSectionPanel>
  );
}
