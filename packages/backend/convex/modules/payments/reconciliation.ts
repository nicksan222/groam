import { docValidator, paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import {
  env,
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx
} from '#convex-generated/server';
import { hasCredentialRejectionProof } from './credentials';
import { reconcileStripe, type ReconciliationOutcome } from './refunds';
import { paymentTables, manualRefundStatus } from './schema';

const RETRY_DELAY = 15 * 60_000;

/** Detach only the immutable provider request/receipt, never payer or traveler personal fields. */
export async function detachPayment(ctx: MutationCtx, row: Doc<'tripPayments'>) {
  const neverSent = (!row.sessionId && !row.checkoutBody) || hasCredentialRejectionProof(row);
  if (!row.paid && !neverSent) {
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
  if (row.sessionId === sessionId || row.manualRefundStatus) return;
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
    if (!row || row.manualRefundStatus || (row.leaseUntil ?? 0) > Date.now()) return null;
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
    refundId: v.optional(v.string()),
    manualRefundStatus: v.optional(manualRefundStatus)
  },
  returns: v.null(),
  handler: async (ctx, { id, terminal, refundId, manualRefundStatus, leaseToken, revision }) => {
    const row = await ctx.db.get(id);
    if (!row || row.leaseToken !== leaseToken || row.revision !== revision) return null;
    if (terminal) await ctx.db.delete(id);
    else
      await ctx.db.patch(id, {
        leaseUntil: undefined,
        leaseToken: undefined,
        nextAttemptAt: Date.now() + RETRY_DELAY,
        ...(refundId ? { refundId } : {}),
        ...(manualRefundStatus ? { manualRefundStatus } : {})
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
    let outcome: ReconciliationOutcome = { terminal: false };
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
      .withIndex('by_manualRefundStatus_and_resolvedAt_and_nextAttemptAt', (q) =>
        q
          .eq('manualRefundStatus', undefined)
          .eq('resolvedAt', undefined)
          .lte('nextAttemptAt', Date.now())
      )
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

const manualItem = v.object({
  id: v.id('paymentReconciliations'),
  sessionId: v.optional(v.string()),
  refundId: v.optional(v.string()),
  status: manualRefundStatus,
  generation: v.number(),
  history: v.array(
    v.object({ refundId: v.string(), status: manualRefundStatus, generation: v.number() })
  )
});

/** Internal operator inspection: bounded pages, no original request URLs or personal fields. */
export const listManual = internalQuery({
  args: { status: manualRefundStatus, paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(manualItem),
  handler: async (ctx, { status, paginationOpts }) => {
    if (
      !Number.isInteger(paginationOpts.numItems) ||
      paginationOpts.numItems < 1 ||
      paginationOpts.numItems > 50
    )
      throw new ConvexError('Inspect between 1 and 50 manual refunds per page');
    const result = await ctx.db
      .query('paymentReconciliations')
      .withIndex('by_manualRefundStatus_and_resolvedAt_and_nextAttemptAt', (q) =>
        q.eq('manualRefundStatus', status).eq('resolvedAt', undefined)
      )
      .paginate(paginationOpts);
    return {
      ...result,
      page: result.page.map((row) => ({
        id: row._id,
        ...(row.sessionId ? { sessionId: row.sessionId } : {}),
        ...(row.refundId ? { refundId: row.refundId } : {}),
        status,
        generation: row.refundGeneration ?? 0,
        history: row.refundHistory ?? []
      }))
    };
  }
});

/** Explicit operator approval only: do not call from a webhook, cron, or public route. */
export const resumeManual = internalMutation({
  args: { id: v.id('paymentReconciliations'), expectedRefundId: v.string(), requestId: v.string() },
  returns: v.null(),
  handler: async (ctx, { id, expectedRefundId, requestId }) => {
    if (requestId.length < 8 || requestId.length > 100)
      throw new ConvexError('Use a stable operator request ID of 8 to 100 characters');
    const row = await ctx.db.get(id);
    if (!row || row.lastResumeRequestId === requestId) return null;
    if (
      row.resolvedAt !== undefined ||
      !row.manualRefundStatus ||
      row.refundId !== expectedRefundId
    )
      throw new ConvexError(
        'The manual refund changed; inspect its current receipt before retrying'
      );
    const history = row.refundHistory ?? [];
    if (history.length >= 10)
      throw new ConvexError(
        'Automatic retry generations exhausted; arrange an alternative customer remedy and retain these receipts'
      );
    await ctx.db.patch(id, {
      refundHistory: [
        ...history,
        {
          refundId: expectedRefundId,
          status: row.manualRefundStatus,
          generation: row.refundGeneration ?? 0
        }
      ],
      refundGeneration: (row.refundGeneration ?? 0) + 1,
      refundId: undefined,
      manualRefundStatus: undefined,
      lastResumeRequestId: requestId,
      revision: row.revision + 1,
      leaseUntil: undefined,
      leaseToken: undefined,
      nextAttemptAt: Date.now()
    });
    await ctx.scheduler.runAfter(0, internal.modules.payments.reconciliation.run, { id });
    return null;
  }
});

/** Record a verified external remedy without discarding failed-refund financial evidence. */
export const resolveManual = internalMutation({
  args: {
    id: v.id('paymentReconciliations'),
    expectedRefundId: v.string(),
    resolutionReference: v.string()
  },
  returns: v.null(),
  handler: async (ctx, { id, expectedRefundId, resolutionReference }) => {
    const reference = resolutionReference.trim();
    if (reference.length < 10 || reference.length > 300)
      throw new ConvexError(
        'Provide a verified remedy receipt or case reference of 10 to 300 characters'
      );
    const row = await ctx.db.get(id);
    if (!row) return null;
    if (!row.manualRefundStatus || row.refundId !== expectedRefundId)
      throw new ConvexError('The manual refund changed; inspect its current receipt first');
    if (row.resolvedAt !== undefined) return null;
    await ctx.db.patch(id, {
      resolvedAt: Date.now(),
      resolutionReference: reference,
      revision: row.revision + 1,
      leaseUntil: undefined,
      leaseToken: undefined
    });
    return null;
  }
});
