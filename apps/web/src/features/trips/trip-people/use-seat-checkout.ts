import type { Id } from '@groam/backend/data-model';
import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
import { useState } from 'react';
import { useTripPayments } from '@/features/trips/hooks/use-trip-payments';

/**
 * Opens Stripe Checkout for one person's seat: the viewer's own, or someone else's an organizer
 * covers. One checkout opens at a time; `pendingUserId` is the seat being opened, and `notice` or
 * `error` say how the last attempt went.
 */
export function useSeatCheckout(tripId: Id<'trips'>) {
  const payments = useTripPayments(tripId);
  // The seat last sent to checkout; it only counts as pending while the action is in flight.
  const [seatUserId, setSeatUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const action = useAsyncAction({ fallbackError: 'Unable to open checkout. Please try again.' });

  const checkout = async (userId: string) => {
    await action.run(async () => {
      setSeatUserId(userId);
      setNotice(null);
      openCheckout(await payments.checkout(userId), setNotice);
    });
  };

  return {
    checkout,
    error: action.error,
    notice,
    payments,
    pendingUserId: action.isPending ? seatUserId : null
  };
}

/** Sends the browser to Stripe Checkout, or says no payment is needed. */
function openCheckout(result: { url?: string | null }, setNotice: (notice: string) => void) {
  if (!result.url) {
    setNotice('No payment is needed. Your trip status will update automatically.');
    return;
  }
  const url = new URL(result.url);
  if (url.origin !== 'https://checkout.stripe.com' || url.username || url.password) {
    throw new Error('Checkout returned an untrusted address. Please try again.');
  }
  // fallow-ignore-next-line security-sink -- HTTPS Stripe Checkout origin and absence of credentials checked above
  window.location.assign(url.href);
}
