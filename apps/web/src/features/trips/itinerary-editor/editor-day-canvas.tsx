import { Button } from '@groam/ui/components/button';
import { BedDouble, Clock3, Plus, Sun, Sunrise, Sunset } from 'lucide-react';
import type { ReactNode } from 'react';
import { entryPeriod, plannerPeriods } from '@/features/trips/hooks/trip-day-planner';
import type { PlannerDay, PlannerEntry, PlannerPeriod } from '@/types/trip-planner';
import { EditorDayRow } from './editor-day-row';

const icons = { full_day: Clock3, morning: Sunrise, afternoon: Sun, evening: Sunset };

export function EditorDayCanvas({
  day,
  onEdit,
  onAdd,
  canAdd,
  activeEditor,
  editorLocked = false
}: {
  day: PlannerDay;
  onEdit: (entry: PlannerEntry) => void;
  onAdd: (period: PlannerPeriod) => void;
  canAdd: boolean;
  activeEditor?: { period: PlannerPeriod; content: ReactNode };
  editorLocked?: boolean;
}) {
  return (
    <div className="border-t border-border">
      {!canAdd ? (
        <p className="border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:px-6">
          Schedule a destination on this day to add activities.
        </p>
      ) : null}
      {plannerPeriods.map((period) => {
        const entries = day.entries.filter((entry) => entryPeriod(entry, day.day) === period.key);
        if (
          period.key === 'full_day' &&
          entries.length === 0 &&
          activeEditor?.period !== 'full_day'
        )
          return null;
        const Icon = icons[period.key];
        return (
          <section
            aria-label={`${period.label}, Day ${day.day}`}
            className="border-t border-border"
            key={period.key}
          >
            <h4 className="flex min-h-14 items-center gap-2 bg-muted/25 px-4 py-2 text-sm font-semibold sm:px-6">
              <Icon aria-hidden="true" className="size-4 text-primary" />
              {period.label}
              <span className="ml-auto hidden text-xs font-normal text-muted-foreground sm:inline">
                {entries.length
                  ? `${entries.length} ${entries.length === 1 ? 'plan' : 'plans'}`
                  : 'Open'}
              </span>
              {canAdd ? (
                <Button
                  aria-label={`Add ${period.label.toLowerCase()} activity to Day ${day.day}`}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-primary/30 bg-background px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:ml-2"
                  disabled={editorLocked}
                  onClick={() => onAdd(period.key)}
                  type="button"
                  unstyled
                >
                  <Plus aria-hidden="true" className="size-3.5" />
                  Add activity
                </Button>
              ) : null}
            </h4>
            {entries.length ? (
              <div className="divide-y divide-border border-t border-border">
                {entries.map((entry) => (
                  <EditorDayRow
                    day={day.day}
                    disabled={editorLocked}
                    entry={entry}
                    key={entry.key}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            ) : null}
            {activeEditor?.period === period.key ? activeEditor.content : null}
          </section>
        );
      })}
      {canAdd &&
      !day.entries.some((entry) => entryPeriod(entry, day.day) === 'full_day') &&
      activeEditor?.period !== 'full_day' ? (
        <Button
          className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-left text-xs font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground sm:px-6"
          disabled={editorLocked}
          onClick={() => onAdd('full_day')}
          type="button"
          unstyled
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Add a flexible, all-day activity
        </Button>
      ) : null}
      {day.stays.length ? (
        <section aria-label="Overnight stay" className="border-t border-border">
          <h4 className="flex items-center gap-2 bg-muted/25 px-4 py-3 text-sm font-semibold sm:px-6">
            <BedDouble aria-hidden="true" className="size-4 text-muted-foreground" />
            Staying overnight
          </h4>
          <div className="divide-y divide-border border-t border-border">
            {day.stays.map(({ stay, destination }) => (
              <EditorDayRow
                day={day.day}
                disabled={editorLocked}
                key={stay.id}
                onEdit={onEdit}
                overnight
                entry={{
                  kind: 'stay',
                  stay,
                  key: stay.id,
                  title: stay.title,
                  location: destination.name,
                  startDay: stay.checkInDay,
                  endDay: stay.checkOutDay,
                  startTime: stay.checkInTime,
                  endTime: stay.checkOutTime,
                  period: 'full_day'
                }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
