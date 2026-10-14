import { Moon, Sun, Sunrise, Sunset } from 'lucide-react';
import { entryPeriod, plannerDate, plannerPeriods } from '@/features/trips/hooks/trip-day-planner';
import { EditorDestinationPhoto } from '@/features/trips/itinerary-editor/editor-destination-photo';
import type { PlannerDay } from '@/types/trip-planner';
import { PlannerEntryCard } from './planner-entry-card';
import { PlannerStayCard } from './planner-stay-card';

const periodIcons = { full_day: Moon, morning: Sunrise, afternoon: Sun, evening: Sunset };

export function PlannerDayCard({
  plan,
  startDate,
  currency
}: {
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
    <section
      aria-label={`Day ${plan.day}${date ? ` ${date}` : ''}`}
      id={`trip-day-${plan.day}`}
      tabIndex={-1}
      className="min-w-0 scroll-mt-6 overflow-hidden rounded-lg border border-border bg-card"
    >
      <header className="flex items-center gap-3 border-b border-border p-4 sm:px-5">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-sm font-semibold tabular-nums text-primary"
        >
          {plan.day}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight">
            Day {plan.day}
            {date ? (
              <span className="mt-0.5 block text-sm font-normal text-muted-foreground sm:ml-3 sm:inline">
                {date}
              </span>
            ) : null}
          </h3>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {locations.length ? locations.join(' → ') : 'Destination still open'}
          </p>
        </div>
        {plan.destinations[0]?.coverUrl ? (
          <EditorDestinationPhoto
            src={plan.destinations[0].coverUrl}
            name={plan.destinations[0].name}
            className="hidden h-16 w-28 shrink-0 rounded-md sm:block"
          />
        ) : null}
      </header>
      {plan.destinations.map((destination) =>
        destination.startDay === plan.day && destination.dayNotes ? (
          <p className="px-4 pt-4 text-sm text-muted-foreground sm:px-6" key={destination.id}>
            {destination.name}: {destination.dayNotes}
          </p>
        ) : null
      )}
      <div className="space-y-4 p-4 sm:p-5">
        {plannerPeriods.map((period) => {
          const entries = plan.entries.filter(
            (entry) => entryPeriod(entry, plan.day) === period.key
          );
          if (period.key === 'full_day' && entries.length === 0) return null;
          const Icon = periodIcons[period.key];
          return (
            <section
              aria-label={`${period.label}, Day ${plan.day}`}
              className="space-y-3"
              key={period.key}
            >
              <h4 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Icon className="size-4" />
                {period.label}
                <span className="h-px flex-1 bg-border" />
              </h4>
              {entries.length ? (
                entries.map((entry) => (
                  <PlannerEntryCard
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
                currency={currency}
                destinationName={destination.name}
                key={stay.id}
                stay={stay}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
