import type { SeatActions } from '@/types/trip-people';
import type { TripTraveler } from '@/types/trips';
import { TripPassNotch } from './trip-pass-notch';
import { TripSeatButton } from './trip-seat-button';
import { offersSeat } from './trip-seat-rules';

/**
 * The card's seat line, a mini boarding-pass stub: a dashed divider with notches in the popover
 * colour, "Seat", then Paid, Free or €1 due, with Cover (Pay for yourself) at the right where the
 * viewer may pay it and no choices carry the button instead.
 */
export function TripPersonCardSeat({
  isYou,
  seats,
  traveler,
  viewerId,
  withAction
}: {
  isYou: boolean;
  seats: SeatActions;
  traveler: TripTraveler;
  viewerId: string;
  /** Show Pay or Cover here; off when the card's Going row carries it. */
  withAction: boolean;
}) {
  const hasSeat = seats.hasSeat(traveler.userId);
  return (
    <div className="relative flex items-center gap-2 border-t-[1.5px] border-dashed border-input px-4 py-3">
      <TripPassNotch className="-top-2 -left-2" surface="popover" />
      <TripPassNotch className="-top-2 -right-2" surface="popover" />
      <span className="text-xs text-muted-foreground">Seat</span>
      <span className="min-w-0 flex-1 text-sm font-semibold">
        {hasSeat ? (seats.isFree(traveler.userId) ? 'Free' : 'Paid') : '€1 due'}
      </span>
      {withAction && offersSeat(traveler, seats, { inCard: true, viewerId }) ? (
        <TripSeatButton
          disabled={seats.disabled || seats.pendingUserId !== null}
          isYou={isYou}
          name={traveler.name}
          onPay={() => seats.onPay(traveler.userId)}
          pending={seats.pendingUserId === traveler.userId}
        />
      ) : null}
    </div>
  );
}
