import { Button } from '@groam/ui/components/button';
import { SheetClose, SheetTitle } from '@groam/ui/components/sheet';
import type { TripTraveler } from '@/types/trips';
import { TripPersonAvatar } from './trip-person-avatar';
import { TripPersonStatusChip } from './trip-person-status-chip';
import { handleLabel } from './trip-roster-groups';
import { TripYouTag } from './trip-you-tag';

/** The manifest's own word for where someone stands. */
function standing(status: TripTraveler['status'], takesPayments: boolean) {
  return {
    going: takesPayments ? 'Cleared to go' : 'Going',
    invited: 'Blocked on a seat',
    maybe: 'Deciding',
    not_going: 'Not going'
  }[status];
}

/**
 * The card's top: face, name, and one sentence on where the person stands with their @handle after
 * it ("Blocked on a seat · @omar"). The status chip appears only when the card has no choices to
 * say it. In a sheet the name is its title and "Done" closes it.
 */
export function TripPersonCardHeader({
  chip,
  isYou,
  sheet,
  takesPayments,
  traveler
}: {
  /** Show the status chip: the card has no choices. */
  chip: boolean;
  isYou: boolean;
  sheet: boolean;
  takesPayments: boolean;
  traveler: TripTraveler;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <TripPersonAvatar size="card" traveler={traveler} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          {sheet ? (
            <SheetTitle className="truncate text-base">{traveler.name}</SheetTitle>
          ) : (
            <span className="truncate font-semibold text-foreground">{traveler.name}</span>
          )}
          {isYou ? <TripYouTag /> : null}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {standing(traveler.status, takesPayments)} · {handleLabel(traveler.handle)}
        </p>
      </div>
      {chip ? <TripPersonStatusChip status={traveler.status} /> : null}
      {sheet ? (
        <SheetClose asChild>
          <Button size="sm" variant="ghost">
            Done
          </Button>
        </SheetClose>
      ) : null}
    </div>
  );
}
