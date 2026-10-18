import type { Id } from '@groam/backend/data-model';
import { create } from 'zustand';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type PendingGearClaim = {
  /** When the claim was made, so a claim nobody picked up stops applying. */
  createdAt: number;
  label: string;
  /** The idea created for this claim; only its own Packing tab may apply it. */
  proposalId: Id<'tripProposals'>;
  sourceTripId: Id<'trips'>;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type PendingGearClaimStore = {
  claim: PendingGearClaim | null;
  clear: () => void;
  setClaim: (claim: Omit<PendingGearClaim, 'createdAt'>) => void;
};

/** A claim older than this is dropped instead of applied. */
export const PENDING_GEAR_CLAIM_TTL_MS = 60_000;

/**
 * "I'll bring one" on the shared trip starts an idea; this carries the item across the
 * navigation so that idea's Packing tab can apply the claim once its working copy loads.
 */
export const usePendingGearClaimStore = create<PendingGearClaimStore>((set) => ({
  claim: null,
  clear: () => set({ claim: null }),
  setClaim: (claim) => set({ claim: { ...claim, createdAt: Date.now() } })
}));
