import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import Timeline from '@groam/ui/components/timeline';
import { BedDouble, CalendarDays, ChevronDown, MapPin, Pencil, Plus, Route } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import type { PlannerDay, PlannerEntry } from '@/types/trip-planner';
import { EditorDayRow } from './editor-day-row';

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
      stay,
      key: `continuing-${stay.id}`,
      title: stay.title,
      location: destination.name,
      startDay: day.day,
      endDay: day.day,
      startTime: null,
      endTime: null,
      period: 'full_day'
    });
  }
  const entries = [...day.entries, ...continuingStays];
  return (
    <>
      <div className="px-4 py-4 sm:px-6">
        {entries.length ? (
          <Timeline aria-label={`Day ${day.day} timeline`}>
            {entries.map((entry) => (
              <Fragment key={entry.key}>
                <EditorDayRow
                  day={day.day}
                  disabled={editorLocked}
                  entry={entry}
                  continuing={entry.key.startsWith('continuing-')}
                  onEdit={onEdit}
                />
                {activeEditor?.entryKey === entry.key ? (
                  <Timeline.Item>
                    <Timeline.Badge>
                      <Pencil />
                    </Timeline.Badge>
                    <Timeline.Body className="block">{activeEditor.content}</Timeline.Body>
                  </Timeline.Item>
                ) : null}
              </Fragment>
            ))}
          </Timeline>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing planned yet. Add the first part of this day.
          </p>
        )}
        {!activeEditor?.entryKey ? activeEditor?.content : null}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/10 px-4 py-4 sm:px-6">
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
