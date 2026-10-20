import { registerRoutes } from '@convex-dev/stripe';
import type { HttpRouter } from 'convex/server';
import { components, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { env } from '#convex-generated/server';

export function registerPaymentWebhook(http: HttpRouter) {
  // Registration is inert: Stripe is only contacted for a configured checkout or webhook.
  registerRoutes(http, components.stripe, {
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
    events: {
      'checkout.session.completed': async (ctx, event) => {
        const session = event.data.object;
        if (
          session.mode !== 'payment' ||
          session.payment_status !== 'paid' ||
          session.amount_total !== 100 ||
          session.currency !== 'eur'
        )
          return;
        const { paymentId, attempt } = session.metadata ?? {};
        if (!paymentId || !attempt) return;
        await ctx.runMutation(internal.modules.payments.storage.complete, {
          id: paymentId as Id<'tripPayments'>,
          attempt,
          sessionId: session.id
        });
      }
    }
  });
}
