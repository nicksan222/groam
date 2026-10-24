import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { SeatActions } from '@/types/trip-people';
import { useSeatCheckout } from './use-seat-checkout';

/**
 * What the People manifest may do with seats on this trip: the viewer pays their own, an organizer
 * covers anyone's, and nothing is payable on an archived trip. `seats` is null when the trip takes
 * no payments.
 */
export function useSeatActions(trip: TripDetail, viewerId: string) {
  const { checkout, error, notice, payments, pendingUserId } = useSeatCheckout(trip.id);
  const archived = trip.archivedAt !== null;
  const canManageOthers = trip.role === 'organizer';
  const seats: SeatActions | null = payments.enabled
    ? {
        canPay: (traveler) => !archived && (traveler.userId === viewerId || canManageOthers),
        disabled: archived || payments.archived,
        hasSeat: (userId) =>
          payments.travelers.some(
            (payment) => payment.userId === userId && (payment.paid || payment.free)
          ),
        isFree: (userId) =>
          payments.travelers.some((payment) => payment.userId === userId && payment.free),
        onPay: (userId) => void checkout(userId),
        pendingUserId
      }
    : null;
  return { error, notice, seats };
}
