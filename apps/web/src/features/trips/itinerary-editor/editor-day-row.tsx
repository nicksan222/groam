import { Button } from '@groam/ui/components/button';
import { BedDouble, MapPin, Pencil, Route } from 'lucide-react';
import {
  activityChangeKey,
  stayChangeKey
} from '@/features/trips/hooks/itinerary-proposal-changes';
import { entryTime } from '@/features/trips/hooks/trip-day-planner';
import { useItineraryProposalChangeList } from '@/features/trips/hooks/use-itinerary-proposal-changes';
import { ItineraryProposalHighlight } from '@/features/trips/itinerary-proposal-highlight/itinerary-proposal-highlight';
import type { PlannerEntry } from '@/types/trip-planner';

export function EditorDayRow({
  entry,
  day,
  onEdit,
  overnight = false
}: {
  entry: PlannerEntry;
  day: number;
  onEdit: (entry: PlannerEntry) => void;
  overnight?: boolean;
}) {
  const changes = useItineraryProposalChangeList();
  const key =
    entry.kind === 'activity'
      ? activityChangeKey(entry.activity)
      : entry.kind === 'stay'
        ? stayChangeKey(entry.stay)
        : null;
  const change = changes?.find((item) => item.key === key) ?? null;
  const Icon = entry.kind === 'travel' ? Route : entry.kind === 'stay' ? BedDouble : MapPin;
  return (
    <ItineraryProposalHighlight
      change={change}
      className="rounded-none [&>div]:ps-0 [&>p]:mb-0 [&>p]:px-4 [&>p]:pt-2"
    >
      <Button
        type="button"
        aria-label={overnight ? `Edit overnight stay at ${entry.title}` : `Edit ${entry.title}`}
        aria-description={`${overnight ? 'Overnight' : entryTime(entry, day)} · ${entry.location}`}
        onClick={() => onEdit(entry)}
        className="group relative grid w-full grid-cols-[5.5rem_minmax(0,1fr)] items-stretch text-left transition-colors hover:bg-muted/40 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,0.7fr)]"
        unstyled
      >
        <span className="px-3 py-4 text-xs font-medium leading-5 tabular-nums sm:px-4">
          {overnight ? 'Overnight' : entryTime(entry, day)}
        </span>
        <span className="min-w-0 border-l border-border px-3 py-4 sm:px-4">
          <span className="block break-words text-sm font-medium leading-5">{entry.title}</span>
          <span className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground sm:hidden">
            <Icon aria-hidden="true" className="mt-1 size-3 shrink-0" />
            {entry.location}
          </span>
          {entry.endDay !== entry.startDay ? (
            <span className="mt-1 block text-xs text-muted-foreground">
              Day {entry.startDay} → Day {entry.endDay}
            </span>
          ) : null}
        </span>
        <span className="hidden min-w-0 items-start gap-2 border-l border-border py-4 pl-4 pr-7 text-xs leading-5 text-muted-foreground sm:flex">
          <Icon aria-hidden="true" className="mt-1 size-3 shrink-0" />
          <span className="break-words">{entry.location}</span>
        </span>
        <Pencil
          aria-hidden="true"
          className="absolute right-3 top-5 hidden size-3 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block"
        />
      </Button>
    </ItineraryProposalHighlight>
  );
}
