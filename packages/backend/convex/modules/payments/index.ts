import { ConvexError } from 'convex/values';
import type { Id } from '#convex-generated/dataModel';
import { env, type MutationCtx, type QueryCtx } from '#convex-generated/server';
import { workspaceRoster } from '#convex/modules/auth/workspace';
import { type TripCtx } from '#convex/modules/travel/trips/ctx';

export function paymentsEnabled() {
  return Boolean(env.STRIPE_SECRET_KEY?.trim());
}

export function requiresTripPayment(trip: TripCtx['trip'], userId: string) {
  return paymentsEnabled() && trip.paymentsRequired === true && trip.creator.userId !== userId;
}

export function paymentFor(ctx: QueryCtx | MutationCtx, tripId: Id<'trips'>, userId: string) {
  return ctx.db
    .query('tripPayments')
    .withIndex('by_tripId_and_userId', (q) => q.eq('tripId', tripId).eq('userId', userId))
    .unique();
}

export async function assertTripPaid(ctx: TripCtx, userId: string) {
  if (
    requiresTripPayment(ctx.trip, userId) &&
    !(await paymentFor(ctx, ctx.trip._id, userId))?.paid
  ) {
    throw new ConvexError('Pay €1 to join this trip, or ask the organizer to cover you');
  }
}

export async function paymentStatus(ctx: TripCtx) {
  const roster = await workspaceRoster(ctx, ctx.workspace);
  const enabled = paymentsEnabled() && ctx.trip.paymentsRequired === true;
  const travelers = await Promise.all(
    roster.members.map(async ({ userId }) => ({
      userId,
      free: !requiresTripPayment(ctx.trip, userId),
      paid: Boolean((await paymentFor(ctx, ctx.trip._id, userId))?.paid)
    }))
  );
  return { enabled, travelers };
}
