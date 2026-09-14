import { ArrowUpRight } from 'lucide-react';
import { plannerDate } from '@/features/trips/hooks/trip-day-planner';
import type { Destination } from '@/types/trips';
import { EditorDestinationPhoto } from './editor-destination-photo';

export function EditorDayHeader({
  day,
  startDate,
  destinations,
  hasPlans,
  onOpenDestination
}: {
  day: number;
  startDate: string | null;
  destinations: Destination[];
  hasPlans: boolean;
  onOpenDestination: (id: Destination['id']) => void;
}) {
  const date = plannerDate(startDate, day);
  return (
    <header className="space-y-3 bg-muted/15 p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-sm font-semibold tabular-nums"
        >
          {day}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">
            Day {day}
            {date ? ` · ${date}` : ''}
          </h3>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {hasPlans ? 'Your plans for the day' : 'Open to explore'}
          </p>
        </div>
      </div>
      {destinations.length ? (
        <div className="flex flex-wrap gap-2">
          {destinations.map((stop) => (
            <button
              key={stop.id}
              type="button"
              onClick={() => onOpenDestination(stop.id)}
              aria-label={`Open ${stop.name} details for Day ${day}`}
              className="group flex min-w-0 max-w-full items-center gap-3 rounded-lg border border-border p-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <EditorDestinationPhoto
                src={stop.coverUrl}
                name={stop.name}
                className="h-10 w-14 shrink-0 rounded-md"
              />
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-semibold">{stop.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {stop.startDay === null || stop.endDay === null
                    ? 'Days not assigned yet'
                    : stop.startDay === stop.endDay
                      ? `Day ${stop.startDay}`
                      : `Days ${stop.startDay}–${stop.endDay}`}
                </span>
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="mr-1 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
              />
            </button>
          ))}
        </div>
      ) : null}
    </header>
  );
}
