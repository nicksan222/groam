import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { workspaceRoster } from '#convex/modules/auth/workspace';
import type { TripCtx } from '#convex/modules/travel/trips/ctx';
import { provider } from './provider';

/** Trips created before seats were tracked stay free; creators never pay. */
export function requiresTripPayment(trip: Doc<'trips'>, userId: string) {
  return trip.paymentRequired === true && trip.creator.userId !== userId;
}

export function paymentFor(ctx: QueryCtx | MutationCtx, tripId: Id<'trips'>, userId: string) {
  return ctx.db
    .query('tripPayments')
    .withIndex('by_tripId_and_userId', (q) => q.eq('tripId', tripId).eq('userId', userId))
    .unique();
}

/** Whether a traveler holds a seat on a shared (non-proposal) trip; a pass provider's travelers always do. */
export async function hasSeat(ctx: QueryCtx | MutationCtx, trip: Doc<'trips'>, userId: string) {
  return (
    !requiresTripPayment(trip, userId) ||
    !provider().collects ||
    Boolean((await paymentFor(ctx, trip._id, userId))?.paid)
  );
}

/** Members with a seat on the trip, resolving ideas to their shared source trip. */
export async function participantsForTrip(
  ctx: QueryCtx | MutationCtx,
  trip: Doc<'trips'>,
  userIds: string[]
): Promise<Set<string>> {
  const source = trip.proposal ? await ctx.db.get('trips', trip.proposal.sourceTripId) : trip;
  if (!source || source.organizationId !== trip.organizationId) return new Set();
  const seats = await Promise.all(userIds.map((userId) => hasSeat(ctx, source, userId)));
  return new Set(userIds.filter((_, index) => seats[index]));
}

export async function canParticipateInTrip(
  ctx: QueryCtx | MutationCtx,
  trip: Doc<'trips'>,
  userId: string
) {
  return (await participantsForTrip(ctx, trip, [userId])).has(userId);
}

export async function assertTripPaid(ctx: TripCtx, userId: string) {
  if (!(await hasSeat(ctx, ctx.trip, userId))) {
    throw new ConvexError('Pay €1 to join this trip, or ask the organizer to cover you');
  }
}

export async function paymentStatus(ctx: TripCtx) {
  const collects = provider().collects;
  const roster = await workspaceRoster(ctx, ctx.workspace);
  const travelers = await Promise.all(
    roster.members.map(async ({ userId }) => ({
      userId,
      free: !requiresTripPayment(ctx.trip, userId),
      paid: !collects || Boolean((await paymentFor(ctx, ctx.trip._id, userId))?.paid)
    }))
  );
  return {
    archived: ctx.trip.archive !== undefined,
    enabled: collects && ctx.trip.paymentRequired === true,
    travelers
  };
}
