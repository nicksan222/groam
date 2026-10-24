import { toast } from '@groam/ui/components/toast';
import { useEffect } from 'react';
import type { useTripPacking } from '@/features/trips/hooks/use-trip-packing';
import {
  PENDING_GEAR_CLAIM_TTL_MS,
  usePendingGearClaimStore
} from '@/lib/stores/pending-gear-claim-store';

/**
 * Applies a claim made on the shared trip ("I'll bring one") once the new idea's working copy
 * has loaded: the viewer's count for the matching item goes up by one. Only the idea created
 * for the claim applies it, and only while the viewer can edit; a stale claim is dropped. The
 * working copy's items carry no link back to the shared item, so the match is by name; when
 * nothing matches the viewer is told.
 */
export function usePendingGearClaim({
  editable,
  packing,
  proposalId,
  viewerUserId
}: {
  editable: boolean;
  packing: Pick<ReturnType<typeof useTripPacking>, 'bring' | 'isLoading' | 'items'>;
  proposalId: string | undefined;
  viewerUserId: string | undefined;
}) {
  const claim = usePendingGearClaimStore((state) => state.claim);
  const clear = usePendingGearClaimStore((state) => state.clear);
  useEffect(() => {
    if (!claim || !proposalId || claim.proposalId !== proposalId) return;
    if (Date.now() - claim.createdAt > PENDING_GEAR_CLAIM_TTL_MS) {
      clear();
      return;
    }
    if (!editable || !viewerUserId || packing.isLoading) return;
    clear();
    const item = packing.items.find(
      (candidate) => candidate.label.toLowerCase() === claim.label.toLowerCase()
    );
    if (!item) {
      toast(`${claim.label} isn’t in this idea`);
      return;
    }
    const mine = item.bringers.find((bringer) => bringer.userId === viewerUserId)?.count ?? 0;
    void packing.bring(item.id, viewerUserId, mine + 1);
  }, [claim, clear, editable, packing, proposalId, viewerUserId]);
}
