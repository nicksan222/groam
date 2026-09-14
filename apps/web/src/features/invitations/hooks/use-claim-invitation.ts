import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useMutation } from 'convex/react';
import { useCallback } from 'react';

export function useClaimInvitation() {
  const claimInvitation = useMutation(api.routes.trips.travelers.claim.run);

  return useCallback(
    async (invitationId: string): Promise<Id<'trips'> | null> => {
      try {
        const tripId = await claimInvitation({ invitationId });
        return (tripId as Id<'trips'> | null) ?? null;
      } catch {
        return null;
      }
    },
    [claimInvitation]
  );
}
