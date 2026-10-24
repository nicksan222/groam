import { Heading } from '@groam/ui/components/heading';
import type { IssueFlagTarget } from '@/types/issues';
import type { TripPlanner } from '@/types/trip-planner';
import { PlanCardFromModel } from './plan-card-from-model';
import { placeModel } from './plan-kind-strategies';
import { PlannerEntryCard } from './planner-entry-card';
import { PlannerFlagButton } from './planner-flag-button';

/** Destinations and travel that have no day yet; nothing when every plan is placed. */
export function PlannerUnscheduled({
  currency,
  onFlag,
  planner
}: {
  currency: string;
  onFlag?: (about: IssueFlagTarget) => void;
  planner: TripPlanner;
}) {
  if (!planner.unscheduledDestinations.length && !planner.unscheduledTravel.length) return null;
  return (
    <section
      aria-label="Plans without a day"
      className="space-y-4 rounded-2xl border border-dashed border-border p-6"
    >
      <Heading level={3}>Still to place</Heading>
      <p className="text-sm text-muted-foreground">These plans do not have a day yet.</p>
      {planner.unscheduledDestinations.map((destination) => (
        <PlanCardFromModel
          id={`itinerary-stop-${destination.id}`}
          key={destination.id}
          model={placeModel(destination)}
        />
      ))}
      {planner.unscheduledTravel.map((entry) => (
        <PlannerEntryCard
          action={onFlag ? <PlannerFlagButton onFlag={onFlag} target={entry.flag} /> : undefined}
          currency={currency}
          day={0}
          entry={entry}
          key={entry.key}
        />
      ))}
    </section>
  );
}
