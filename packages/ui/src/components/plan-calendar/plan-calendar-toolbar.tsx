import { ChevronLeft, ChevronRight } from '@groam/icons';
import { usePlanCalendar } from '#src/components/plan-calendar/plan-calendar-context';
import { Button } from '#tsx/components/button';
import { KloqNav, KloqToolbar, useKloq } from '#tsx/vendor/kloq/calendar/chrome';

/** "Day 1 – Day 7" for a trip without dates, where a month title would be made up. */
function undatedTitle(days: readonly Date[], dayLabel: (date: Date) => string | null) {
  const labels = days.flatMap((day) => dayLabel(day) ?? []);
  const first = labels[0];
  const last = labels.at(-1);
  if (!first || !last) return 'Outside trip';
  return first === last ? first : `${first} – ${last}`;
}

function WholeTrip() {
  const calendar = useKloq();
  const { tripStart, tripView } = usePlanCalendar();
  return (
    <Button
      onClick={() => {
        calendar.switchView(tripView);
        calendar.goToDate(tripStart);
      }}
      size="xs"
      variant="outline"
    >
      Whole trip
    </Button>
  );
}

/** An undated trip steps through its days only: no today, month or year to show. */
function UndatedNav() {
  const calendar = useKloq();
  const { dayLabel } = usePlanCalendar();
  return (
    <div className="flex min-w-0 items-center gap-1">
      <Button
        aria-label="Previous days"
        onClick={() => calendar.step(-1)}
        size="icon-sm"
        variant="ghost"
      >
        <ChevronLeft />
      </Button>
      <Button
        aria-label="Next days"
        onClick={() => calendar.step(1)}
        size="icon-sm"
        variant="ghost"
      >
        <ChevronRight />
      </Button>
      <h3 aria-live="polite" className="ml-1 truncate text-sm font-semibold">
        {undatedTitle(calendar.view.days, dayLabel)}
      </h3>
    </div>
  );
}

/** Kloq's own navigation and view switch, with a way back to the whole trip. */
export function PlanCalendarToolbar() {
  const { undated } = usePlanCalendar();
  return (
    <KloqToolbar>
      {undated ? <UndatedNav /> : <KloqNav />}
      <WholeTrip />
    </KloqToolbar>
  );
}
