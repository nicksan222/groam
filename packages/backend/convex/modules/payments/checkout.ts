import { ConvexError } from 'convex/values';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ActionCtx } from '#convex-generated/server';
import { createSession, expireSession, isPaid, matchesPrice, retrieveSession } from './stripe';

/** Returns an open Checkout URL, or null once no payment is needed. */
export async function checkout(
  ctx: ActionCtx,
  args: { tripId: Id<'trips'>; userId?: string }
): Promise<{ url: string | null }> {
  const payment = await ctx.runMutation(internal.modules.payments.storage.prepare, args);
  if (!payment) return { url: null };
  let session = payment.sessionId ? await retrieveSession(payment.sessionId) : null;
  if (!session || session.status === 'expired') {
    session = await createSession(payment);
    const attached = await ctx.runMutation(internal.modules.payments.storage.attach, {
      id: payment.id,
      replaces: payment.sessionId,
      sessionId: session.id
    });
    if (!attached) {
      await expireSession(session.id);
      throw new ConvexError('Checkout changed. Please try again.');
    }
  }
  if (isPaid(session)) {
    await ctx.runMutation(internal.modules.payments.storage.complete, {
      paymentId: payment.id,
      sessionId: session.id,
      priceMatches: matchesPrice(session)
    });
    return { url: null };
  }
  if (session.status === 'open' && session.url) return { url: session.url };
  throw new ConvexError('Your payment is processing. Please wait.');
}
