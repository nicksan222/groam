import type { Doc } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { paymentFor, requiresTripPayment } from './index';

/** Ideas inherit their shared trip's entitlement; draft authors do not get a free seat. */
export async function canParticipateInTrip(
  ctx: QueryCtx | MutationCtx,
  trip: Doc<'trips'>,
  userId: string
): Promise<boolean> {
  const source = trip.proposal ? await ctx.db.get('trips', trip.proposal.sourceTripId) : trip;
  if (!source || source.organizationId !== trip.organizationId) return false;
  if (!requiresTripPayment(source, userId)) return true;
  return Boolean((await paymentFor(ctx, source._id, userId))?.paid);
}
