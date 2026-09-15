import { Moon, Sun, Sunrise, Sunset } from 'lucide-react';
import { entryPeriod, plannerDate, plannerPeriods } from '@/features/trips/hooks/trip-day-planner';
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
      className="min-w-0 scroll-mt-6 rounded-2xl border border-border bg-muted/15"
    >
      <header className="flex items-start gap-4 border-b border-border px-4 py-5 sm:px-6">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-xl font-semibold tabular-nums text-primary"
        >
          {String(plan.day).padStart(2, '0')}
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight">
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
      </header>
      {plan.destinations.map((destination) =>
        destination.startDay === plan.day && destination.dayNotes ? (
          <p className="px-4 pt-4 text-sm text-muted-foreground sm:px-6" key={destination.id}>
            {destination.name}: {destination.dayNotes}
          </p>
        ) : null
      )}
      <div className="space-y-6 p-4 sm:p-6">
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
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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
