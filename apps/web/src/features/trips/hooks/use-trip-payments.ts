import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useAction, useQuery } from 'convex/react';
import { useCallback } from 'react';

export function useTripPayments(tripId: Id<'trips'> | undefined) {
  const status = useQuery(api.routes.trips.payments.status.run, tripId ? { tripId } : 'skip');
  const checkoutAction = useAction(api.routes.trips.payments.checkout.run);
  const checkout = useCallback(
    async (userId: string) => {
      if (!tripId) return { skipped: true, url: null };
      return checkoutAction({ tripId, userId });
    },
    [checkoutAction, tripId]
  );

  return {
    archived: status?.archived ?? false,
    checkout,
    enabled: status?.enabled ?? false,
    isLoading: status === undefined,
    travelers: status?.travelers ?? []
  };
}
