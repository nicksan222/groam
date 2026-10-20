import { docValidator } from 'convex/server';
import { v } from 'convex/values';
import { internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import { env, internalAction, internalMutation, type MutationCtx } from '#convex-generated/server';
import { reconcileStripe } from './refunds';
import { paymentTables } from './schema';

const RETRY_DELAY = 15 * 60_000;

/** Detach only the immutable provider request/receipt, never payer or traveler personal fields. */
export async function detachPayment(ctx: MutationCtx, row: Doc<'tripPayments'>) {
  if (!row.paid) {
    const id = await ctx.db.insert('paymentReconciliations', {
      revision: 0,
      ...(row.providerKeyHash ? { providerKeyHash: row.providerKeyHash } : {}),
      paymentId: row._id,
      attempt: row.attempt,
      expiresAt: row.expiresAt,
      ...(row.sessionId ? { sessionId: row.sessionId } : {}),
      ...(row.checkoutBody ? { checkoutBody: row.checkoutBody } : {}),
      nextAttemptAt: Date.now()
    });
    await ctx.scheduler.runAfter(0, internal.modules.payments.reconciliation.run, { id });
  }
  await ctx.db.delete('tripPayments', row._id);
}

/** A creation response or verified webhook can arrive after the personal row was removed. */
export async function attachDeletedSession(
  ctx: MutationCtx,
  paymentId: Id<'tripPayments'>,
  attempt: string,
  sessionId: string
) {
  const row = await ctx.db
    .query('paymentReconciliations')
    .withIndex('by_paymentId_and_attempt', (q) =>
      q.eq('paymentId', paymentId).eq('attempt', attempt)
    )
    .unique();
  if (!row) return;
  if (row.sessionId && row.sessionId !== sessionId) throw new Error('Checkout session mismatch');
  if (row.sessionId === sessionId) return;
  await ctx.db.patch(row._id, {
    sessionId,
    revision: row.revision + 1,
    leaseToken: undefined,
    leaseUntil: undefined,
    nextAttemptAt: Date.now()
  });
  await ctx.scheduler.runAfter(0, internal.modules.payments.reconciliation.run, { id: row._id });
}

export const claim = internalMutation({
  args: { id: v.id('paymentReconciliations') },
  returns: v.union(
    v.null(),
    docValidator('paymentReconciliations', paymentTables.paymentReconciliations)
  ),
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row || (row.leaseUntil ?? 0) > Date.now()) return null;
    const leaseToken = crypto.randomUUID();
    await ctx.db.patch(id, {
      leaseToken,
      leaseUntil: Date.now() + 120_000,
      nextAttemptAt: Date.now() + RETRY_DELAY
    });
    return { ...row, leaseToken };
  }
});

/** Persist recovered Stripe identity before any further external operation can fail. */
export const rememberSession = internalMutation({
  args: {
    id: v.id('paymentReconciliations'),
    leaseToken: v.string(),
    revision: v.number(),
    sessionId: v.string()
  },
  returns: v.boolean(),
  handler: async (ctx, { id, leaseToken, revision, sessionId }) => {
    const row = await ctx.db.get(id);
    if (!row || row.leaseToken !== leaseToken || row.revision !== revision) return false;
    if (row.sessionId && row.sessionId !== sessionId) return false;
    await ctx.db.patch(id, { sessionId });
    return true;
  }
});

export const finish = internalMutation({
  args: {
    id: v.id('paymentReconciliations'),
    terminal: v.boolean(),
    leaseToken: v.string(),
    revision: v.number(),
    refundId: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, { id, terminal, refundId, leaseToken, revision }) => {
    const row = await ctx.db.get(id);
    if (!row || row.leaseToken !== leaseToken || row.revision !== revision) return null;
    if (terminal) await ctx.db.delete(id);
    else
      await ctx.db.patch(id, {
        leaseUntil: undefined,
        leaseToken: undefined,
        nextAttemptAt: Date.now() + RETRY_DELAY,
        ...(refundId ? { refundId } : {})
      });
    return null;
  }
});

export const run = internalAction({
  args: { id: v.id('paymentReconciliations') },
  returns: v.null(),
  handler: async (ctx, { id }): Promise<null> => {
    const row = await ctx.runMutation(internal.modules.payments.reconciliation.claim, { id });
    if (!row?.leaseToken) return null;
    const leaseToken = row.leaseToken;
    let outcome: { terminal: boolean; refundId?: string } = { terminal: false };
    if (env.STRIPE_SECRET_KEY?.trim()) {
      try {
        outcome = await reconcileStripe(row, (sessionId) =>
          ctx.runMutation(internal.modules.payments.reconciliation.rememberSession, {
            id,
            leaseToken,
            revision: row.revision,
            sessionId
          })
        );
      } catch {
        /* Durable row is retried by the bounded sweep. */
      }
    }
    await ctx.runMutation(internal.modules.payments.reconciliation.finish, {
      id,
      ...outcome,
      leaseToken,
      revision: row.revision
    });
    return null;
  }
});

/** One indexed, bounded batch; unsuccessful work backs off rather than scheduling a busy loop. */
export const sweep = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query('paymentReconciliations')
      .withIndex('by_nextAttemptAt', (q) => q.lte('nextAttemptAt', Date.now()))
      .take(50);
    await Promise.all(
      rows.map(async (row) => {
        await ctx.db.patch(row._id, { nextAttemptAt: Date.now() + RETRY_DELAY });
        await ctx.scheduler.runAfter(0, internal.modules.payments.reconciliation.run, {
          id: row._id
        });
      })
    );
    return null;
  }
});
