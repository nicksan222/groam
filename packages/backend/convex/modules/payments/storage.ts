import { ConvexError, v } from 'convex/values';
import type { Doc } from '#convex-generated/dataModel';
import { internalMutation } from '#convex-generated/server';
import { hasOrganizationMembership } from '#convex/modules/auth/workspace';
import { TripTravelers } from '#convex/modules/travel/travelers/index';
import { isTripAdmin, loadSharedTripContext } from '#convex/modules/travel/trips/ctx';
import { hasCredentialRejectionProof } from './credentials';
import { paymentFor, paymentsEnabled, requiresTripPayment } from './index';
import { attachDeletedSession, detachPayment } from './reconciliation';

function expiredUnsent(row: Doc<'tripPayments'>): boolean {
  return (
    row.requestProtocol === 'persist-before-io-v1' &&
    !row.checkoutBody &&
    !row.sessionId &&
    row.expiresAt <= Math.floor(Date.now() / 1000)
  );
}

/** A transaction reserves the traveler for one payer; retries reuse Stripe's idempotency key. */
export const prepare = internalMutation({
  args: {
    tripId: v.id('trips'),
    userId: v.optional(v.string()),
    expiredAttempt: v.optional(v.string())
  },
  returns: v.union(
    v.null(),
    v.object({
      id: v.id('tripPayments'),
      attempt: v.string(),
      expiresAt: v.number(),
      sessionId: v.union(v.string(), v.null()),
      shortId: v.string(),
      payerId: v.string()
    })
  ),
  handler: async (ctx, { tripId, userId, expiredAttempt }) => {
    const loaded = await loadSharedTripContext(ctx, tripId, undefined, { allowUnpaid: true });
    const targetId = userId ?? loaded.workspace.userId;
    if (targetId !== loaded.workspace.userId && !isTripAdmin(loaded))
      throw new ConvexError('Only organizers can cover another traveler');
    if (!(await hasOrganizationMembership(ctx, loaded.trip.organizationId, targetId)))
      throw new ConvexError('Traveler not found');
    if (!requiresTripPayment(loaded.trip, targetId)) return null;
    if (!envReady()) throw new ConvexError('Payments are not fully configured');
    if (loaded.trip.archive || loaded.trip.proposal)
      throw new ConvexError('This trip cannot accept payments');
    const existing = await paymentFor(ctx, loaded.trip._id, targetId);
    if (existing?.paid) return null;
    // Only protocol-marked, never-sent expired attempts can rotate without provider proof.
    // recordRequest's attempt CAS prevents a stale action from sending the replaced attempt.
    if (
      existing &&
      expiredAttempt !== existing.attempt &&
      !expiredUnsent(existing) &&
      !hasCredentialRejectionProof(existing)
    ) {
      return {
        id: existing._id,
        attempt: existing.attempt,
        expiresAt: existing.expiresAt,
        sessionId: existing.sessionId ?? null,
        shortId: loaded.trip.shortId,
        payerId: existing.payerId
      };
    }
    const fields = {
      requestProtocol: 'persist-before-io-v1' as const,
      attempt: crypto.randomUUID(),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      paid: false,
      payerId: loaded.workspace.userId,
      tripId: loaded.trip._id,
      userId: targetId
    };
    const id = existing ? existing._id : await ctx.db.insert('tripPayments', fields);
    if (existing)
      await ctx.db.patch('tripPayments', id, {
        ...fields,
        sessionId: undefined,
        checkoutBody: undefined,
        providerKeyHash: undefined,
        firstRequestToken: undefined,
        creationRetried: undefined,
        credentialRejection: undefined
      });
    return {
      id,
      attempt: fields.attempt,
      expiresAt: fields.expiresAt,
      sessionId: null,
      shortId: loaded.trip.shortId,
      payerId: fields.payerId
    };
  }
});

import { env } from '#convex-generated/server';
function envReady() {
  return paymentsEnabled() && Boolean(env.STRIPE_WEBHOOK_SECRET?.trim());
}

export const recordRequest = internalMutation({
  args: {
    id: v.id('tripPayments'),
    attempt: v.string(),
    body: v.string(),
    keyHash: v.string(),
    requestToken: v.optional(v.string())
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { id, attempt, body, keyHash, requestToken }) => {
    const row = await ctx.db.get(id);
    if (!row || row.attempt !== attempt) return null;
    if (row.checkoutBody) {
      if (row.providerKeyHash !== keyHash)
        throw new ConvexError(
          'This checkout needs reconciliation before changing Stripe credentials.'
        );
      // Every second provider send invalidates first-response proof permanently. A prior
      // timeout may already have created a session, even if this replay returns 401.
      await ctx.db.patch(id, { creationRetried: true, credentialRejection: undefined });
      return row.checkoutBody;
    }
    await ctx.db.patch(id, {
      checkoutBody: body,
      providerKeyHash: keyHash,
      firstRequestToken: row.requestProtocol === 'persist-before-io-v1' ? requestToken : undefined,
      creationRetried: false,
      credentialRejection: undefined
    });
    return body;
  }
});

/** Only the first, unreplayed creation's definite Stripe authentication failure is proof. */
export const recordCredentialRejection = internalMutation({
  args: { id: v.id('tripPayments'), attempt: v.string(), requestToken: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { id, attempt, requestToken }) => {
    const row = await ctx.db.get(id);
    if (
      !row ||
      row.attempt !== attempt ||
      row.requestProtocol !== 'persist-before-io-v1' ||
      row.firstRequestToken !== requestToken ||
      row.creationRetried ||
      row.sessionId ||
      row.paid
    )
      return false;
    await ctx.db.patch(id, { credentialRejection: 'stripe-401-invalid-key' });
    return true;
  }
});

export const attachSession = internalMutation({
  args: { id: v.id('tripPayments'), attempt: v.string(), sessionId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get('tripPayments', args.id);
    if (row?.attempt === args.attempt) {
      await ctx.db.patch('tripPayments', row._id, { sessionId: args.sessionId });
      return true;
    }
    await attachDeletedSession(ctx, args.id, args.attempt, args.sessionId);
    return false;
  }
});

/** Only signature-verified Stripe events (or authenticated server retrieval) call this. */
export const complete = internalMutation({
  args: { id: v.id('tripPayments'), attempt: v.string(), sessionId: v.string() },
  returns: v.null(),
  handler: async (ctx, { id, attempt, sessionId }) => {
    const row = await ctx.db.get('tripPayments', id);
    if (!row) {
      await attachDeletedSession(ctx, id, attempt, sessionId);
      return null;
    }
    if (row.paid || row.attempt !== attempt) return null;
    if (row.sessionId && row.sessionId !== sessionId)
      throw new ConvexError('Checkout session mismatch');
    const trip = await ctx.db.get('trips', row.tripId);
    if (
      !trip ||
      trip.archive ||
      !requiresTripPayment(trip, row.userId) ||
      !(await hasOrganizationMembership(ctx, trip.organizationId, row.userId))
    ) {
      // A paid Checkout cannot grant access after departure or archival. Preserve the
      // verified session atomically for the existing durable refund reconciler.
      await detachPayment(ctx, { ...row, sessionId });
      return null;
    }
    await ctx.db.patch('tripPayments', id, { paid: true, sessionId });
    // Do not change a later explicit RSVP or revive an archived trip on delayed delivery.
    const traveler = await ctx.db
      .query('tripTravelers')
      .withIndex('by_tripId_and_userId', (q) => q.eq('tripId', trip._id).eq('userId', row.userId))
      .unique();
    if (!trip.archive && (!traveler || traveler.status === 'invited')) {
      await TripTravelers.markPaidGoing(ctx, trip, row.userId);
    }
    return null;
  }
});
