import Shell from '@groam/ui/components/shell/client';
import { buildTripPlanner } from '@/features/trips/hooks/trip-day-planner';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripEmptyItinerary } from '@/features/trips/trip-destinations/trip-empty-itinerary';
import { TripRouteSummary } from '@/features/trips/trip-destinations/trip-route-summary';
import type { IssueFlagTarget } from '@/types/issues';
import { PlannerDayCard } from './planner-day-card';
import { PlannerUnscheduled } from './planner-unscheduled';

/**
 * The read-only itinerary: every day's plans in full, what has no day yet, and the route.
 * `onFlag` adds a Flag control to each card, for a shared trip that can still be questioned.
 */
export function TripDayPlanner({
  onFlag,
  trip
}: {
  onFlag?: (about: IssueFlagTarget) => void;
  trip: TripDetail;
}) {
  const planner = buildTripPlanner(trip);
  const hasDays = planner.days.length > 0;
  if (trip.destinations.length === 0 && !hasDays) {
    return (
      <section aria-label="Day planner" className="min-w-0 space-y-6">
        <TripEmptyItinerary />
      </section>
    );
  }
  return (
    <section aria-label="Day planner" className="min-w-0 space-y-6">
      <Shell.TwoColumns>
        <Shell.LeftColumn>
          {planner.days.map((plan) => (
            <PlannerDayCard
              currency={trip.currency}
              key={plan.day}
              onFlag={onFlag}
              plan={plan}
              startDate={trip.startDate}
            />
          ))}
          <PlannerUnscheduled currency={trip.currency} onFlag={onFlag} planner={planner} />
        </Shell.LeftColumn>
        <Shell.RightColumn>
          <TripRouteSummary
            dayPlanner
            days={planner.days}
            destinations={trip.destinations}
            startDate={trip.startDate}
          />
        </Shell.RightColumn>
      </Shell.TwoColumns>
    </section>
  );
}
