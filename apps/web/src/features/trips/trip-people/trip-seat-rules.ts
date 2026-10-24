import type { SeatActions } from '@/types/trip-people';
import type { TripTraveler } from '@/types/trips';

/** Whether this person may be set to Going: only with a seat, on a trip that takes payments. */
export function canGo(traveler: TripTraveler, seats: SeatActions | null) {
  return seats === null || seats.hasSeat(traveler.userId);
}

/**
 * Whether to offer Pay or Cover for this person's seat: only without a seat, to whoever may pay it.
 * On a manifest row it is for a yes (Blocked) and never for the viewer, whose seat is paid on the
 * pass. Inside a person's card paying is a deliberate act, so a maybe is offered it too, and so is
 * the viewer for themselves.
 */
export function offersSeat(
  traveler: TripTraveler,
  seats: SeatActions | null,
  { inCard, viewerId }: { inCard: boolean; viewerId: string }
) {
  if (seats === null || seats.hasSeat(traveler.userId) || !seats.canPay(traveler)) return false;
  if (inCard) return traveler.status === 'invited' || traveler.status === 'maybe';
  return traveler.status === 'invited' && traveler.userId !== viewerId;
}
