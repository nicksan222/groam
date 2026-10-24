import { matchesPrice, PaymentProviderError } from '@groam/payments';
import { ConvexError } from 'convex/values';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ActionCtx } from '#convex-generated/server';
import {
  deploymentTag,
  idempotencyKey,
  provider,
  TRIP_PRICE,
  TRIP_PRODUCT,
  tripReturnUrl
} from './provider';

/** Returns an open checkout URL, or null once no payment is needed. */
export async function checkout(
  ctx: ActionCtx,
  args: { tripId: Id<'trips'>; userId?: string }
): Promise<{ url: string | null }> {
  try {
    return await openCheckout(ctx, args);
  } catch (error) {
    if (error instanceof PaymentProviderError) throw new ConvexError(error.message);
    throw error;
  }
}

async function openCheckout(ctx: ActionCtx, args: { tripId: Id<'trips'>; userId?: string }) {
  const payment = await ctx.runMutation(internal.modules.payments.storage.prepare, args);
  if (!payment) return { url: null };
  const payments = provider();
  let current = payment.checkoutId ? await payments.retrieveCheckout(payment.checkoutId) : null;
  if (!current || current.status === 'expired') {
    current = await payments.createCheckout({
      price: TRIP_PRICE,
      description: TRIP_PRODUCT,
      reference: payment.id,
      deployment: deploymentTag(),
      returnUrl: tripReturnUrl(payment.shortId),
      idempotencyKey: idempotencyKey('checkout', payment.id, payment.checkoutId ?? 'first')
    });
    const attached = await ctx.runMutation(internal.modules.payments.storage.attach, {
      id: payment.id,
      replaces: payment.checkoutId,
      checkoutId: current.id
    });
    if (!attached) {
      await payments.expireCheckout(current.id);
      throw new ConvexError('Checkout changed. Please try again.');
    }
  }
  if (current.paid) {
    await ctx.runMutation(internal.modules.payments.storage.complete, {
      paymentId: payment.id,
      checkoutId: current.id,
      priceMatches: matchesPrice(current, TRIP_PRICE)
    });
    return { url: null };
  }
  if (current.status === 'open' && current.url) return { url: current.url };
  throw new ConvexError('Your payment is processing. Please wait.');
}
