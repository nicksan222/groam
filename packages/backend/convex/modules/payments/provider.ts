import { paymentProvider } from '@groam/payments';
import { v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { env, internalAction } from '#convex-generated/server';

/** The only price Groam sells: one traveler, one trip. */
export const TRIP_PRICE = { amount: 100, currency: 'eur' } as const;
export const TRIP_PRODUCT = 'Groam — one traveler, one trip';
const REFUND_RETRY_DELAYS = [60_000, 10 * 60_000, 60 * 60_000, 6 * 60 * 60_000];

/** The deployment's provider; without credentials, every traveler holds an already-paid pass. */
export function provider() {
  return paymentProvider({
    stripe: { secretKey: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET }
  });
}

/** Distinguishes this deployment's checkouts from others sharing the provider account. */
export function deploymentTag() {
  return env.CONVEX_SITE_URL ?? 'local';
}

export function idempotencyKey(...parts: string[]) {
  return ['groam', ...parts].join('-');
}

/** Where Stripe sends a traveler back to: the trip's People section, where seats live. */
export function tripReturnUrl(shortId: string): string {
  const site = new URL(env.SITE_URL ?? 'http://localhost:5173');
  const local = ['localhost', '127.0.0.1'].includes(site.hostname);
  const base = site.pathname === '/' ? (local ? '' : '/app') : site.pathname.replace(/\/$/u, '');
  return new URL(`${base}/trips/${encodeURIComponent(shortId)}/people`, site.origin).href;
}

export const expire = internalAction({
  args: { checkoutId: v.string() },
  returns: v.null(),
  handler: async (_ctx, { checkoutId }) => {
    await provider().expireCheckout(checkoutId);
    return null;
  }
});

/** Refunds a paid checkout that could not become a seat. The checkout-derived key makes retries safe. */
export const refund = internalAction({
  args: { checkoutId: v.string(), attempt: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, { checkoutId, attempt = 0 }) => {
    const payments = provider();
    try {
      await payments.refundCheckout(checkoutId, idempotencyKey('refund', checkoutId));
    } catch (error) {
      const delay = REFUND_RETRY_DELAYS[attempt];
      if (delay === undefined) {
        console.error(
          `Refund for ${payments.name} checkout ${checkoutId} failed; refund it in ${payments.name}.`,
          error
        );
      } else {
        await ctx.scheduler.runAfter(delay, internal.modules.payments.provider.refund, {
          checkoutId,
          attempt: attempt + 1
        });
      }
    }
    return null;
  }
});
