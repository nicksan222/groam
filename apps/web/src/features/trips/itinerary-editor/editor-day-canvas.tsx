import { BedDouble, CalendarDays, ChevronDown, MapPin, Plus, Route } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { Fragment, type ReactNode } from 'react';
import {
  entryPeriod,
  plannerPeriods,
  stayFlagTarget
} from '@/features/trips/hooks/trip-day-planner';
import { PlannerPeriodHeading } from '@/features/trips/trip-planner/planner-period-heading';
import type { PlannerDay, PlannerEntry } from '@/types/trip-planner';
import { EditorDayRow } from './editor-day-row';

export function EditorDayCanvas({
  currency,
  day,
  onEdit,
  onAdd,
  canAdd,
  activeEditor,
  editorLocked = false
}: {
  currency: string;
  day: PlannerDay;
  onEdit: (entry: PlannerEntry) => void;
  onAdd: (kind: 'activity' | 'stay' | 'travel' | 'destination') => void;
  canAdd: boolean;
  activeEditor?: { entryKey?: string; content: ReactNode };
  editorLocked?: boolean;
}) {
  const continuingStays: PlannerEntry[] = [];
  for (const { stay, destination } of day.stays) {
    if (stay.checkInDay >= day.day) continue;
    continuingStays.push({
      kind: 'stay',
      event: 'overnight',
      stay,
      key: `continuing-${stay.id}`,
      title: stay.title,
      location: destination.name,
      startDay: day.day,
      endDay: day.day,
      startTime: null,
      endTime: null,
      period: 'full_day',
      flag: stayFlagTarget(stay)
    });
  }
  const entries = [...day.entries, ...continuingStays];
  return (
    <>
      <div className="space-y-3 p-4 sm:p-6">
        {entries.length ? (
          <div aria-label={`Day ${day.day} timeline`} className="space-y-4" role="group">
            {plannerPeriods.map((period) => {
              const inPeriod = entries.filter(
                (entry) => entryPeriod(entry, day.day) === period.key
              );
              if (inPeriod.length === 0) return null;
              return (
                <section
                  aria-label={`${period.label}, Day ${day.day}`}
                  className="space-y-3"
                  key={period.key}
                >
                  <PlannerPeriodHeading label={period.label} period={period.key} />
                  <ul className="space-y-3">
                    {inPeriod.map((entry) => (
                      <Fragment key={entry.key}>
                        <li>
                          <EditorDayRow
                            continuing={entry.key.startsWith('continuing-')}
                            currency={currency}
                            day={day.day}
                            disabled={editorLocked}
                            entry={entry}
                            onEdit={onEdit}
                          />
                        </li>
                        {activeEditor?.entryKey === entry.key ? (
                          <li>{activeEditor.content}</li>
                        ) : null}
                      </Fragment>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nothing planned yet. Add the first part of this day.
          </p>
        )}
        {!activeEditor?.entryKey ? activeEditor?.content : null}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={editorLocked} size="sm" variant="outline">
              <Plus />
              Add to day
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem disabled={!canAdd} onSelect={() => onAdd('activity')}>
              <CalendarDays />
              Activity
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canAdd} onSelect={() => onAdd('stay')}>
              <BedDouble />
              Stay
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canAdd} onSelect={() => onAdd('travel')}>
              <Route />
              Travel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onAdd('destination')}>
              <MapPin />
              Destination
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-xs text-muted-foreground">
          {entries.length} {entries.length === 1 ? 'plan' : 'plans'} for this day
        </span>
      </footer>
    </>
  );
}
