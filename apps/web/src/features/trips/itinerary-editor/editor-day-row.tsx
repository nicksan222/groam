import { Pencil } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import {
  activityChangeKey,
  stayChangeKey
} from '@/features/trips/hooks/itinerary-proposal-changes';
import { useItineraryProposalChangeList } from '@/features/trips/hooks/use-itinerary-proposal-changes';
import { ItineraryProposalHighlight } from '@/features/trips/itinerary-proposal-highlight/itinerary-proposal-highlight';
import { PlannerEntryCard } from '@/features/trips/trip-planner/planner-entry-card';
import type { PlannerEntry } from '@/types/trip-planner';

function changeKeyFor(entry: PlannerEntry) {
  if (entry.kind === 'activity') return activityChangeKey(entry.activity);
  if (entry.kind === 'stay') return stayChangeKey(entry.stay);
  return null;
}

/** A planner entry card with its edit control; the same card the read-only overview shows. */
export function EditorDayRow({
  entry,
  currency,
  day,
  disabled = false,
  onEdit,
  continuing = false
}: {
  entry: PlannerEntry;
  currency: string;
  day: number;
  disabled?: boolean;
  onEdit: (entry: PlannerEntry) => void;
  continuing?: boolean;
}) {
  const changes = useItineraryProposalChangeList();
  const changeKey = changeKeyFor(entry);
  const change = changes?.find((item) => item.key === changeKey) ?? null;
  return (
    <ItineraryProposalHighlight change={change} className="-ms-3">
      <PlannerEntryCard
        action={
          <Button
            aria-label={
              continuing ? `Edit overnight stay at ${entry.title}` : `Edit ${entry.title}`
            }
            className="-my-1 -me-2 shrink-0"
            disabled={disabled}
            onClick={() => onEdit(entry)}
            size="icon-xs"
            variant="ghost"
          >
            <Pencil />
          </Button>
        }
        currency={currency}
        day={day}
        entry={entry}
        timeLabel={continuing ? 'Overnight' : undefined}
      />
    </ItineraryProposalHighlight>
  );
}
