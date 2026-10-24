import type { Id } from '@groam/backend/data-model';
import { List } from '@groam/ui/components/list';
import { useTripTravelers } from '@/features/trips/hooks/use-trip-travelers';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { TripPaymentRow } from './trip-payment-row';
import { useSeatCheckout } from './use-seat-checkout';

/** The seats list on the join paywall: who has paid, and a way to pay or cover the rest. */
export function TripPaymentsPanel({
  canManageOthers,
  tripId
}: {
  canManageOthers: boolean;
  tripId: Id<'trips'>;
}) {
  const { checkout, error, notice, payments, pendingUserId } = useSeatCheckout(tripId);
  const { travelers } = useTripTravelers(tripId);
  const viewerId = useWorkspace().session.user.id;
  const paymentsLocked = payments.archived;

  if (!payments.enabled) return null;

  return (
    <section aria-label="Trip payments" className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">Seats</h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Everyone needs a seat to join this trip: €1 per traveler for this trip, paid once. The
          trip creator is free.{' '}
          {canManageOthers
            ? 'As an organizer you can also cover anyone else’s seat.'
            : 'An organizer can cover your seat instead.'}{' '}
          Checkout opens on Stripe; the seat is confirmed after payment is received.
        </p>
      </div>
      <List bleed={false}>
        <List.Body>
          <List.Group aria-label="Seats">
            {payments.travelers.map((payment) => {
              const traveler = travelers.find((member) => member.userId === payment.userId);
              if (!traveler) return null;
              const isYou = payment.userId === viewerId;
              return (
                <TripPaymentRow
                  canPay={isYou || canManageOthers}
                  disabled={paymentsLocked || pendingUserId !== null}
                  isYou={isYou}
                  key={payment.userId}
                  name={traveler.name}
                  onPay={checkout}
                  payment={payment}
                  pending={pendingUserId === payment.userId}
                />
              );
            })}
          </List.Group>
        </List.Body>
      </List>
      {paymentsLocked && (
        <p className="text-xs text-muted-foreground">
          Payments are locked while this trip is archived.
        </p>
      )}
      {notice && (
        <p className="text-xs text-muted-foreground" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
