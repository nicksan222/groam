import type { Doc } from '#convex-generated/dataModel';

/** Proof is valid only for the sole tracked creation, never a later replay. */
export function hasCredentialRejectionProof(row: Doc<'tripPayments'>): boolean {
  return (
    row.credentialRejection === 'stripe-401-invalid-key' &&
    Boolean(row.firstRequestToken) &&
    !row.creationRetried &&
    !row.sessionId &&
    !row.paid
  );
}
