import { matchesPrice, WebhookVerificationError } from '@groam/payments';
import type { HttpRouter } from 'convex/server';
import { internal } from '#convex-generated/api';
import { httpAction } from '#convex-generated/server';
import { deploymentTag, provider, TRIP_PRICE } from './provider';

export const PAYMENT_WEBHOOK_PATH = '/payments/webhook';

const paymentWebhook = httpAction(async (ctx, request) => {
  let completed;
  try {
    completed = await provider().completedCheckout(request);
  } catch (error) {
    if (!(error instanceof WebhookVerificationError)) throw error;
    console.error(`Payment webhook signature verification failed: ${error.message}`);
    return new Response('Invalid signature', { status: 400 });
  }
  // Checkouts from other deployments or without a seat reference are acknowledged and ignored.
  if (completed?.paid && completed.reference && completed.deployment === deploymentTag()) {
    await ctx.runMutation(internal.modules.payments.storage.complete, {
      paymentId: completed.reference,
      checkoutId: completed.id,
      priceMatches: matchesPrice(completed, TRIP_PRICE)
    });
  }
  return new Response(null, { status: 200 });
});

export function registerPaymentWebhook(http: HttpRouter) {
  http.route({ path: PAYMENT_WEBHOOK_PATH, method: 'POST', handler: paymentWebhook });
}
