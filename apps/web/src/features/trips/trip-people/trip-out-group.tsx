import { Button } from '@groam/ui/components/button';
import type { PeopleActions } from '@/types/trip-people';
import type { TripTraveler } from '@/types/trips';
import { TripPersonAvatar } from './trip-person-avatar';
import { TripPersonList } from './trip-person-list';
import { TripPersonRow } from './trip-person-row';

const NAMES_SHOWN = 3;

/** "Noah Becker, Yara Nasser" or "A, B, C +2": the first few names, then how many more. */
function namesLine(travelers: TripTraveler[]) {
  const shown = travelers.slice(0, NAMES_SHOWN).map((traveler) => traveler.name);
  const more = travelers.length - shown.length;
  return `${shown.join(', ')}${more > 0 ? ` +${more}` : ''}`;
}

/**
 * Not going: one quiet line (muted overlapping faces and the first names) with Show, which opens
 * a plain list of rows, each opening the person's card. Someone moved here while it is folded
 * unfolds it.
 */
export function TripOutGroup({
  actions,
  onOpenChange,
  open,
  travelers
}: {
  actions: PeopleActions;
  onOpenChange: (open: boolean) => void;
  /** Whether the list is showing; the roster owns it so a person moved here can be revealed. */
  open: boolean;
  travelers: TripTraveler[];
}) {
  return (
    <section aria-label="Not going" className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span aria-hidden className="flex -space-x-2">
          {travelers.slice(0, NAMES_SHOWN).map((traveler) => (
            <TripPersonAvatar
              className="opacity-60 ring-2 ring-background"
              key={traveler.id}
              size="sm"
              traveler={traveler}
            />
          ))}
        </span>
        <p className="min-w-0 flex-1 truncate">Not going · {namesLine(travelers)}</p>
        <Button
          aria-expanded={open}
          data-people-toggle="not_going"
          className="font-normal text-muted-foreground"
          onClick={() => onOpenChange(!open)}
          size="sm"
          variant="ghost"
        >
          {open ? 'Hide' : 'Show'}
        </Button>
      </div>
      {open ? (
        <TripPersonList>
          {travelers.map((traveler) => (
            <TripPersonRow actions={actions} key={traveler.id} quiet traveler={traveler} />
          ))}
        </TripPersonList>
      ) : null}
    </section>
  );
}
