import { Button } from '@groam/ui/components/button';
import { plannerDate } from '@/features/trips/hooks/trip-day-planner';
import { dayHue } from '@/features/trips/trip-map/trip-map-stops';
import type { PlannerDay } from '@/types/trip-planner';
import { jumpToDay } from './trip-jump-targets';

/** Every day as a jump target: its hue, its date, and how many plans it holds. */
export function RouteDayList({
  days,
  startDate
}: {
  days: PlannerDay[];
  startDate: string | null;
}) {
  if (days.length === 0) return null;
  return (
    <nav aria-label="Jump to a day" className="border-t border-border p-2">
      <p className="px-2 pb-1 pt-2 text-xs font-semibold">Days</p>
      <ol className="grid grid-cols-1 gap-1">
        {days.map(({ day, entries }) => {
          const date = plannerDate(startDate, day);
          return (
            <li key={day}>
              <Button
                aria-label={`Jump to day ${day}`}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-xs transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => jumpToDay(day)}
                type="button"
                unstyled
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: dayHue(day) }}
                />
                <span className="font-medium">Day {day}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{date}</span>
                <span className="tabular-nums text-muted-foreground">
                  {entries.length === 0 ? 'Open' : entries.length}
                </span>
              </Button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
