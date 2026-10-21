import { registerRoutes } from '@convex-dev/stripe';
import type { HttpRouter } from 'convex/server';
import { components, internal } from '#convex-generated/api';
import { env } from '#convex-generated/server';
import { deploymentTag, isPaid, matchesPrice } from './stripe';

export function registerPaymentWebhook(http: HttpRouter) {
  // The component verifies the Stripe signature before any handler runs.
  registerRoutes(http, components.stripe, {
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
    events: {
      'checkout.session.completed': async (ctx, event) => {
        const session = event.data.object;
        const paymentId = session.metadata?.groamPaymentId;
        if (!paymentId || session.metadata?.groamDeployment !== deploymentTag()) return;
        if (!isPaid(session)) return;
        await ctx.runMutation(internal.modules.payments.storage.complete, {
          paymentId,
          sessionId: session.id,
          priceMatches: matchesPrice(session)
        });
      }
    }
  });
}
