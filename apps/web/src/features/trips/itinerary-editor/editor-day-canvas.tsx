import { BedDouble, Clock3, Sun, Sunrise, Sunset } from 'lucide-react';
import { entryPeriod, plannerPeriods } from '@/features/trips/hooks/trip-day-planner';
import type { PlannerDay, PlannerEntry } from '@/types/trip-planner';
import { EditorDayRow } from './editor-day-row';
import { EditorEmptyDay } from './editor-empty-day';

const icons = { full_day: Clock3, morning: Sunrise, afternoon: Sun, evening: Sunset };

export function EditorDayCanvas({
  day,
  onEdit
}: {
  day: PlannerDay;
  onEdit: (entry: PlannerEntry) => void;
}) {
  if (!day.entries.length && !day.stays.length) return <EditorEmptyDay />;
  return (
    <div className="border-t border-border">
      <div
        aria-hidden="true"
        className="hidden grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,0.7fr)] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid"
      >
        <span className="px-4 py-3">Time</span>
        <span className="border-l border-border px-4 py-3">Plan</span>
        <span className="border-l border-border px-4 py-3">Place</span>
      </div>
      {plannerPeriods.map((period) => {
        const entries = day.entries.filter((entry) => entryPeriod(entry, day.day) === period.key);
        if (period.key === 'full_day' && entries.length === 0) return null;
        const Icon = icons[period.key];
        return (
          <section
            key={period.key}
            aria-label={`${period.label}, Day ${day.day}`}
            className="border-t border-border"
          >
            <h4 className="flex items-center gap-2 bg-muted/30 px-4 py-2.5 text-xs font-medium">
              <Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />
              {period.label}
              <span className="ml-auto font-normal text-muted-foreground">
                {entries.length
                  ? `${entries.length} ${entries.length === 1 ? 'plan' : 'plans'}`
                  : 'Free time'}
              </span>
            </h4>
            {entries.length ? (
              <div className="divide-y divide-border border-t border-border">
                {entries.map((entry) => (
                  <EditorDayRow key={entry.key} entry={entry} day={day.day} onEdit={onEdit} />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
      {day.stays.length ? (
        <section aria-label="Overnight stay" className="border-t border-border">
          <h4 className="flex items-center gap-2 bg-muted/30 px-4 py-2.5 text-xs font-medium">
            <BedDouble aria-hidden="true" className="size-3.5 text-muted-foreground" />
            Staying overnight
          </h4>
          <div className="divide-y divide-border border-t border-border">
            {day.stays.map(({ stay, destination }) => (
              <EditorDayRow
                key={stay.id}
                day={day.day}
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
