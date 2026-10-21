import type { Doc } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { paymentFor, requiresTripPayment } from './index';

/** Ideas inherit their shared trip's entitlement; draft authors do not get a free seat. */
export async function canParticipateInTrip(
  ctx: QueryCtx | MutationCtx,
  trip: Doc<'trips'>,
  userId: string
): Promise<boolean> {
  return (await participantsForTrip(ctx, trip, [userId])).has(userId);
}

/** Resolves the canonical source once when checking a bounded roster. */
export async function participantsForTrip(
  ctx: QueryCtx | MutationCtx,
  trip: Doc<'trips'>,
  userIds: string[]
): Promise<Set<string>> {
  const source = trip.proposal ? await ctx.db.get('trips', trip.proposal.sourceTripId) : trip;
  if (!source || source.organizationId !== trip.organizationId) return new Set();
  const permitted = await Promise.all(
    userIds.map(
      async (userId) =>
        !requiresTripPayment(source, userId) ||
        Boolean((await paymentFor(ctx, source._id, userId))?.paid)
    )
  );
  return new Set(userIds.filter((_, index) => permitted[index]));
}
