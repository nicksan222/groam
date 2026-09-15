import Shell from '@groam/ui/components/shell/client';
import { CalendarDays, MapPin } from 'lucide-react';
import { buildTripPlanner } from '@/features/trips/hooks/trip-day-planner';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripEmptyItinerary } from '@/features/trips/trip-destinations/trip-empty-itinerary';
import { TripRouteSummary } from '@/features/trips/trip-destinations/trip-route-summary';
import { PlannerDayCard } from './planner-day-card';
import { PlannerEntryCard } from './planner-entry-card';

export function TripDayPlanner({ trip }: { trip: TripDetail }) {
  const planner = buildTripPlanner(trip);
  return (
    <section aria-label="Day planner" className="min-w-0 space-y-5">
      <div className="flex items-start gap-3">
        <CalendarDays className="mt-1 size-5 text-primary" />
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Your days, at a glance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {planner.days.length
              ? 'Follow each day from morning to evening. Open a plan for the details.'
              : 'A little structure for your next adventure.'}
          </p>
        </div>
      </div>
      {trip.destinations.length === 0 && planner.days.length === 0 ? (
        <TripEmptyItinerary />
      ) : (
        <Shell.TwoColumns>
          <Shell.LeftColumn>
            {planner.days.map((plan) => (
              <PlannerDayCard
                currency={trip.currency}
                key={plan.day}
                plan={plan}
                startDate={trip.startDate}
              />
            ))}
            {planner.unscheduledDestinations.length || planner.unscheduledTravel.length ? (
              <section
                aria-label="Plans without a day"
                className="space-y-4 rounded-2xl border border-dashed border-border p-5"
              >
                <h3 className="font-semibold">Still to place</h3>
                <p className="text-sm text-muted-foreground">These plans do not have a day yet.</p>
                {planner.unscheduledDestinations.map((destination) => (
                  <div
                    id={`itinerary-stop-${destination.id}`}
                    key={destination.id}
                    className="flex items-start gap-3 rounded-xl bg-muted/30 p-4"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">{destination.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Days to be decided</p>
                      {destination.dayNotes ? (
                        <p className="mt-2 text-sm text-muted-foreground">{destination.dayNotes}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
                {planner.unscheduledTravel.map((entry) => (
                  <PlannerEntryCard
                    currency={trip.currency}
                    day={0}
                    entry={entry}
                    key={entry.key}
                  />
                ))}
              </section>
            ) : null}
          </Shell.LeftColumn>
          <Shell.RightColumn>
            <TripRouteSummary dayPlanner destinations={trip.destinations} />
          </Shell.RightColumn>
        </Shell.TwoColumns>
      )}
    </section>
  );
}
