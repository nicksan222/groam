import { ConvexError, v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { internalMutation } from '#convex-generated/server';
import { hasOrganizationMembership } from '#convex/modules/auth/workspace';
import { TripTravelers } from '#convex/modules/travel/travelers/index';
import { isTripAdmin, loadSharedTripContext } from '#convex/modules/travel/trips/ctx';
import { paymentFor, requiresTripPayment } from './index';

/** Reserves the traveler's seat row; null when no payment is needed. */
export const prepare = internalMutation({
  args: { tripId: v.id('trips'), userId: v.optional(v.string()) },
  returns: v.union(
    v.null(),
    v.object({
      id: v.id('tripPayments'),
      sessionId: v.union(v.string(), v.null()),
      shortId: v.string()
    })
  ),
  handler: async (ctx, { tripId, userId }) => {
    const loaded = await loadSharedTripContext(ctx, tripId, undefined, { allowUnpaid: true });
    const targetId = userId ?? loaded.workspace.userId;
    if (targetId !== loaded.workspace.userId && !isTripAdmin(loaded))
      throw new ConvexError('Only organizers can cover another traveler');
    if (!(await hasOrganizationMembership(ctx, loaded.trip.organizationId, targetId)))
      throw new ConvexError('Traveler not found');
    if (!requiresTripPayment(loaded.trip, targetId)) return null;
    if (loaded.trip.archive) throw new ConvexError('This trip cannot accept payments');
    const existing = await paymentFor(ctx, loaded.trip._id, targetId);
    if (existing?.paid) return null;
    const id =
      existing?._id ??
      (await ctx.db.insert('tripPayments', {
        tripId: loaded.trip._id,
        userId: targetId,
        paid: false
      }));
    return { id, sessionId: existing?.sessionId ?? null, shortId: loaded.trip.shortId };
  }
});

/** Records a new session only if it replaces the session the caller saw. */
export const attach = internalMutation({
  args: {
    id: v.id('tripPayments'),
    replaces: v.union(v.string(), v.null()),
    sessionId: v.string()
  },
  returns: v.boolean(),
  handler: async (ctx, { id, replaces, sessionId }) => {
    const row = await ctx.db.get('tripPayments', id);
    if (row?.sessionId === sessionId) return true;
    if (!row || row.paid || (row.sessionId ?? null) !== replaces) return false;
    await ctx.db.patch('tripPayments', id, { sessionId });
    return true;
  }
});

/**
 * Every paid session yields exactly a seat or a refund. Only signature-verified webhooks and
 * authenticated provider reads call this; foreign or malformed payment ids are ignored.
 */
export const complete = internalMutation({
  args: { paymentId: v.string(), sessionId: v.string(), priceMatches: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { paymentId, sessionId, priceMatches }) => {
    const id = ctx.db.normalizeId('tripPayments', paymentId);
    if (!id) return null;
    const row = await ctx.db.get('tripPayments', id);
    if (row?.paid && row.sessionId === sessionId) return null;
    const trip = row && !row.paid ? await ctx.db.get('trips', row.tripId) : null;
    if (
      !row ||
      !trip ||
      !priceMatches ||
      trip.archive ||
      !requiresTripPayment(trip, row.userId) ||
      !(await hasOrganizationMembership(ctx, trip.organizationId, row.userId))
    ) {
      await ctx.scheduler.runAfter(0, internal.modules.payments.stripe.refund, { sessionId });
      return null;
    }
    await ctx.db.patch('tripPayments', id, { paid: true, sessionId });
    await TripTravelers.seatConfirmed(ctx, trip);
    return null;
  }
});
