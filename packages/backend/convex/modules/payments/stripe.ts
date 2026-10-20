import type { FunctionReturnType } from 'convex/server';
import { ConvexError } from 'convex/values';
import { z } from 'zod';
import type { internal } from '#convex-generated/api';
import { env } from '#convex-generated/server';

const sessionSchema = z.object({
  id: z.string(),
  url: z.string().nullable(),
  status: z.string().nullable(),
  payment_status: z.string(),
  amount_total: z.number().nullable(),
  currency: z.string().nullable(),
  metadata: z.record(z.string(), z.string()).nullable()
});
export type CheckoutSession = z.infer<typeof sessionSchema>;
export type PaymentAttempt = NonNullable<
  FunctionReturnType<typeof internal.modules.payments.storage.prepare>
>;
export class CheckoutCreationExpired extends Error {}

export async function stripeRequest(path: string, body?: URLSearchParams, idempotencyKey?: string) {
  // fallow-ignore-next-line security-sink -- fixed HTTPS Stripe API origin; callers only supply encoded session IDs; redirects refused
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions${path}`, {
    method: body ? 'POST' : 'GET',
    redirect: 'error',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
    },
    ...(body ? { body: body.toString() } : {}),
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) {
    if (body && response.status === 400) {
      const error = z
        .object({ error: z.object({ param: z.string().optional() }) })
        .safeParse(await response.json());
      if (error.success && error.data.error.param === 'expires_at')
        throw new CheckoutCreationExpired();
    }
    throw new ConvexError('Unable to start payment. Please try again.');
  }
  return sessionSchema.parse(await response.json());
}

function tripReturnUrl(shortId: string): string {
  const site = new URL(env.SITE_URL ?? 'http://localhost:5173');
  const local = ['localhost', '127.0.0.1'].includes(site.hostname);
  const base = site.pathname === '/' ? (local ? '' : '/app') : site.pathname.replace(/\/$/u, '');
  return new URL(`${base}/trips/${encodeURIComponent(shortId)}/board`, site.origin).href;
}

export function assertPayer(payment: PaymentAttempt, payerId: string): void {
  if (payment.payerId !== payerId)
    throw new ConvexError(
      'Another traveler is already paying. Try again after their checkout expires.'
    );
}

export function isPaid(session: CheckoutSession): boolean {
  return (
    session.payment_status === 'paid' && session.amount_total === 100 && session.currency === 'eur'
  );
}

export async function createSession(payment: PaymentAttempt) {
  // Stripe may prune idempotency keys after 24h. An unknown old attempt must be reconciled,
  // never recreated blindly; its original request may have succeeded and been paid.
  if (Math.floor(Date.now() / 1000) > payment.expiresAt + 22 * 3600)
    throw new ConvexError(
      'This checkout needs reconciliation. Contact support before retrying payment.'
    );
  const tripUrl = tripReturnUrl(payment.shortId);
  const body = new URLSearchParams({
    mode: 'payment',
    success_url: tripUrl,
    cancel_url: tripUrl,
    'payment_method_types[0]': 'card',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': '100',
    'line_items[0][price_data][product_data][name]': 'Groam — one traveler, one trip',
    'line_items[0][quantity]': '1',
    'metadata[paymentId]': payment.id,
    'metadata[attempt]': payment.attempt,
    expires_at: String(payment.expiresAt)
  });
  return stripeRequest('', body, `groam-trip-${payment.id}-${payment.attempt}`);
}
