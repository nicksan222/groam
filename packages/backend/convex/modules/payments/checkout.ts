import { ConvexError } from 'convex/values';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ActionCtx } from '#convex-generated/server';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import {
  assertPayer,
  CheckoutCreationExpired,
  createSession,
  isPaid,
  stripeRequest,
  type PaymentAttempt
} from './stripe';

async function loadSession(ctx: ActionCtx, payment: PaymentAttempt, payerId: string) {
  if (payment.sessionId) {
    const session = await stripeRequest(`/${encodeURIComponent(payment.sessionId)}`);
    const active = await ctx.runMutation(internal.modules.payments.storage.attachSession, {
      id: payment.id,
      attempt: payment.attempt,
      sessionId: session.id
    });
    if (!active) throw new ConvexError('This trip is no longer available for payment.');
    return session;
  }
  // After the reserved expiration another authorized payer may replay the original key
  // to reconcile a lost response. Only the outer handler may expose an open session URL,
  // and it still requires the original payer until Stripe confirms expiration.
  if (Math.floor(Date.now() / 1000) < payment.expiresAt) assertPayer(payment, payerId);
  const session = await createSession(ctx, payment);
  const attached = await ctx.runMutation(internal.modules.payments.storage.attachSession, {
    id: payment.id,
    attempt: payment.attempt,
    sessionId: session.id
  });
  if (!attached) throw new ConvexError('This trip is no longer available for payment.');
  return session;
}

export async function checkout(
  ctx: ActionCtx,
  args: { tripId: Id<'trips'>; userId?: string }
): Promise<{ url: string | null; skipped: boolean }> {
  const { userId: payerId } = await requireWorkspace(ctx);
  let payment = await ctx.runMutation(internal.modules.payments.storage.prepare, args);
  for (let retry = 0; retry < 4; retry += 1) {
    if (!payment) return { url: null, skipped: true };
    try {
      const session = await loadSession(ctx, payment, payerId);
      if (isPaid(session)) {
        await ctx.runMutation(internal.modules.payments.storage.complete, {
          id: payment.id,
          attempt: payment.attempt,
          sessionId: session.id
        });
        return { url: null, skipped: true };
      }
      if (session.status === 'open' && session.url) {
        assertPayer(payment, payerId);
        return { url: session.url, skipped: false };
      }
      if (session.status !== 'expired')
        throw new ConvexError('Your payment is processing. Please wait.');
    } catch (error: unknown) {
      if (!(error instanceof CheckoutCreationExpired)) throw error;
      // Within the idempotency retention window a successful original request replays its
      // session. An expires_at validation rejection proves no session was created for the key.
    }
    // Compare-and-swap: another payer may already have renewed this attempt. Reinspect the
    // returned reservation rather than creating a session blindly with stale payer attribution.
    payment = await ctx.runMutation(internal.modules.payments.storage.prepare, {
      ...args,
      expiredAttempt: payment.attempt
    });
  }
  throw new ConvexError('Checkout changed while retrying. Please try again.');
}
