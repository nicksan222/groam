import type { Id } from '@groam/backend/data-model';
import { useState } from 'react';
import { useTripPayments } from '@/features/trips/hooks/use-trip-payments';
import { useTripTravelers } from '@/features/trips/hooks/use-trip-travelers';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { errorMessage } from '@/lib/errors';
import { TripPaymentRow } from './trip-payment-row';

export function TripPaymentsPanel({
  canManageOthers,
  tripId
}: {
  canManageOthers: boolean;
  tripId: Id<'trips'>;
}) {
  const payments = useTripPayments(tripId);
  const { travelers } = useTripTravelers(tripId);
  const viewerId = useWorkspace().session.user.id;
  const paymentsLocked = payments.archived;
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!payments.enabled) return null;

  const checkout = async (userId: string) => {
    setPendingUserId(userId);
    setError(null);
    setNotice(null);
    try {
      const result = await payments.checkout(userId);
      if (result.url) {
        const url = new URL(result.url);
        if (url.origin !== 'https://checkout.stripe.com' || url.username || url.password) {
          throw new Error('Checkout returned an untrusted address. Please try again.');
        }
        // fallow-ignore-next-line security-sink -- HTTPS Stripe Checkout origin and absence of credentials checked above
        window.location.assign(url.href);
      } else {
        setNotice('No payment is needed. Your trip status will update automatically.');
      }
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Unable to open checkout. Please try again.'));
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <section aria-label="Trip payments" className="space-y-3 border-t border-border pt-4">
      <div>
        <h3 className="text-sm font-medium">Trip access</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          €1 per traveler for this trip, paid once. The trip creator is free. Checkout opens on
          Stripe; joining is confirmed after payment is received.
        </p>
      </div>
      <ul className="space-y-2">
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
      </ul>
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
