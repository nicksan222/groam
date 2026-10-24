import {
  entryPeriod,
  plannerDate,
  plannerPeriods,
  stayFlagTarget
} from '@/features/trips/hooks/trip-day-planner';
import type { IssueFlagTarget } from '@/types/issues';
import type { PlannerDay } from '@/types/trip-planner';
import { PlannerDayFrame } from './planner-day-frame';
import { PlannerEntryCard } from './planner-entry-card';
import { PlannerFlagButton } from './planner-flag-button';
import { PlannerPeriodHeading } from './planner-period-heading';
import { PlannerStayCard } from './planner-stay-card';

export function PlannerDayCard({
  onFlag,
  plan,
  startDate,
  currency
}: {
  /** Shows a Flag control on every card; leave out where the plan is not up for questions. */
  onFlag?: (about: IssueFlagTarget) => void;
  plan: PlannerDay;
  startDate: string | null;
  currency: string;
}) {
  const date = plannerDate(startDate, plan.day);
  const locations = [
    ...new Set([
      ...plan.destinations.map((destination) => destination.name),
      ...plan.entries.flatMap((entry) => (entry.kind !== 'travel' ? [entry.location] : []))
    ])
  ];
  return (
    <PlannerDayFrame
      ariaLabel={`Day ${plan.day}${date ? ` ${date}` : ''}`}
      date={date}
      day={plan.day}
      photo={
        plan.destinations[0]?.coverUrl
          ? { name: plan.destinations[0].name, src: plan.destinations[0].coverUrl }
          : undefined
      }
      subtitle={locations.length ? locations.join(' → ') : 'Destination still open'}
    >
      {plan.destinations.map((destination) =>
        destination.startDay === plan.day && destination.dayNotes ? (
          <p className="px-4 pt-4 text-sm text-muted-foreground sm:px-6" key={destination.id}>
            {destination.name}: {destination.dayNotes}
          </p>
        ) : null
      )}
      <div className="space-y-4 p-4 sm:p-6">
        {plannerPeriods.map((period) => {
          const entries = plan.entries.filter(
            (entry) => entryPeriod(entry, plan.day) === period.key
          );
          if (period.key === 'full_day' && entries.length === 0) return null;
          return (
            <section
              aria-label={`${period.label}, Day ${plan.day}`}
              className="space-y-3"
              key={period.key}
            >
              <PlannerPeriodHeading label={period.label} period={period.key} />
              {entries.length ? (
                entries.map((entry) => (
                  <PlannerEntryCard
                    action={
                      onFlag ? <PlannerFlagButton onFlag={onFlag} target={entry.flag} /> : undefined
                    }
                    day={plan.day}
                    currency={currency}
                    entry={entry}
                    key={entry.key}
                  />
                ))
              ) : (
                <p className="py-1 pl-6 text-xs text-muted-foreground">
                  {plan.entries.length
                    ? 'No separate plans for this part of the day'
                    : 'Open time · nothing planned yet'}
                </p>
              )}
            </section>
          );
        })}
        {plan.stays.length ? (
          <div className="space-y-2 border-t border-border pt-4">
            {plan.stays.map(({ stay, destination }) => (
              <PlannerStayCard
                action={
                  onFlag ? (
                    <PlannerFlagButton onFlag={onFlag} target={stayFlagTarget(stay)} />
                  ) : undefined
                }
                currency={currency}
                destinationName={destination.name}
                key={stay.id}
                stay={stay}
              />
            ))}
          </div>
        ) : null}
      </div>
    </PlannerDayFrame>
  );
}
