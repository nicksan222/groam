import { Button } from '@groam/ui/components/button';
import Timeline from '@groam/ui/components/timeline';
import { BedDouble, Clock3, MapPin, Pencil, Route } from 'lucide-react';
import {
  activityChangeKey,
  stayChangeKey
} from '@/features/trips/hooks/itinerary-proposal-changes';
import { entryTime } from '@/features/trips/hooks/trip-day-planner';
import { useItineraryProposalChangeList } from '@/features/trips/hooks/use-itinerary-proposal-changes';
import { ItineraryProposalHighlight } from '@/features/trips/itinerary-proposal-highlight/itinerary-proposal-highlight';
import type { PlannerEntry } from '@/types/trip-planner';

function iconFor(entry: PlannerEntry) {
  if (entry.kind === 'travel') return Route;
  if (entry.kind === 'stay') return BedDouble;
  return MapPin;
}

function changeKeyFor(entry: PlannerEntry) {
  if (entry.kind === 'activity') return activityChangeKey(entry.activity);
  if (entry.kind === 'stay') return stayChangeKey(entry.stay);
  return null;
}

function labelFor(entry: PlannerEntry, continuing: boolean) {
  if (continuing) return 'Continuing stay';
  if (entry.kind === 'stay') return 'Stay';
  if (entry.kind === 'travel') return 'Travel';
  return 'Activity';
}

export function EditorDayRow({
  entry,
  day,
  disabled = false,
  onEdit,
  continuing = false
}: {
  entry: PlannerEntry;
  day: number;
  disabled?: boolean;
  onEdit: (entry: PlannerEntry) => void;
  continuing?: boolean;
}) {
  const changes = useItineraryProposalChangeList();
  const changeKey = changeKeyFor(entry);
  const change = changes?.find((item) => item.key === changeKey) ?? null;
  const Icon = iconFor(entry);
  const timing = continuing ? 'Overnight' : entryTime(entry, day);
  return (
    <Timeline.Item>
      <Timeline.Badge className={entry.kind === 'stay' ? 'bg-primary/10 text-primary' : undefined}>
        <Icon aria-hidden="true" />
      </Timeline.Badge>
      <Timeline.Body className="block">
        <ItineraryProposalHighlight change={change}>
          <Timeline.Card
            className={
              entry.kind === 'travel'
                ? 'border-dashed'
                : entry.kind === 'stay'
                  ? 'border-primary/20'
                  : undefined
            }
          >
            <Timeline.CardHeader>
              <span className="text-xs font-medium tabular-nums">{timing}</span>
              <span className="text-border">·</span>
              <span className="text-xs text-muted-foreground">{labelFor(entry, continuing)}</span>
            </Timeline.CardHeader>
            <Timeline.CardBody className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-foreground">{entry.title}</p>
                <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="mt-0.5 size-3 shrink-0" />
                  {entry.location}
                </p>
                {entry.endDay !== entry.startDay ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Days {entry.startDay}–{entry.endDay}
                  </p>
                ) : null}
              </div>
              <Button
                aria-label={
                  continuing ? `Edit overnight stay at ${entry.title}` : `Edit ${entry.title}`
                }
                disabled={disabled}
                onClick={() => onEdit(entry)}
                size="icon-xs"
                variant="ghost"
              >
                <Pencil />
              </Button>
            </Timeline.CardBody>
          </Timeline.Card>
        </ItineraryProposalHighlight>
      </Timeline.Body>
    </Timeline.Item>
  );
}
