import { usePlanCalendar } from '#src/components/plan-calendar/plan-calendar-context';
import { cn } from '#src/lib/utils';
import type { DayHeaderProps } from '#src/vendor/kloq/calendar/slots';

/** A column heading that leads with the trip day, so "Day 3" reads before the weekday. */
export function PlanCalendarDayHeader({ date, isToday, nameShort }: DayHeaderProps) {
  const { dayLabel, undated } = usePlanCalendar();
  const label = dayLabel(date);
  if (undated)
    return (
      <div
        className="min-w-0 border-l border-border/70 px-1 py-2 text-xs first:border-l-0"
        data-cal-day-header
      >
        <p className="truncate px-2 py-2 text-xs font-semibold text-foreground">
          {label ?? 'Outside trip'}
        </p>
      </div>
    );
  return (
    <div
      className="@container min-w-0 border-l border-border/70 px-1 py-2 text-xs first:border-l-0 @[4.5rem]:px-3"
      data-cal-day-header
    >
      <p
        className={cn(
          'truncate text-2xs font-semibold uppercase tracking-wide',
          label ? 'text-foreground' : 'text-muted-foreground/60'
        )}
      >
        {label ?? 'Outside trip'}
      </p>
      <p className="mt-1 flex items-center gap-2 text-muted-foreground">
        <span className="sr-only @[4.5rem]:not-sr-only">{nameShort}</span>
        <span
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full tabular-nums',
            isToday && 'bg-primary font-medium text-primary-foreground'
          )}
        >
          {date.getDate()}
        </span>
      </p>
    </div>
  );
}
