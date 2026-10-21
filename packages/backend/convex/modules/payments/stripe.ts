import { ConvexError, v } from 'convex/values';
import { z } from 'zod';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { env, internalAction } from '#convex-generated/server';

/** The only price Groam sells: one traveler, one trip. */
export const TRIP_PRICE = { amount: 100, currency: 'eur' } as const;
const REFUND_RETRY_DELAYS = [60_000, 10 * 60_000, 60 * 60_000, 6 * 60 * 60_000];

const sessionSchema = z.object({
  id: z.string(),
  url: z.string().nullable(),
  status: z.string().nullable(),
  payment_status: z.string(),
  amount_total: z.number().nullable(),
  currency: z.string().nullable(),
  payment_intent: z.string().nullable().optional()
});

export function isPaid(session: { payment_status: string }) {
  return session.payment_status === 'paid';
}

export function matchesPrice(session: { amount_total: number | null; currency: string | null }) {
  return session.amount_total === TRIP_PRICE.amount && session.currency === TRIP_PRICE.currency;
}

/** Distinguishes this deployment's sessions from others sharing the Stripe account. */
export function deploymentTag() {
  return env.CONVEX_SITE_URL ?? 'local';
}

function idempotencyKey(...parts: string[]) {
  return ['groam', ...parts].join('-');
}

async function stripeFetch(path: string, body?: Record<string, string>, key?: string) {
  // fallow-ignore-next-line security-sink -- fixed HTTPS Stripe API origin; callers only supply encoded IDs; redirects refused
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    redirect: 'error',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      ...(key ? { 'Idempotency-Key': key } : {})
    },
    ...(body ? { body: new URLSearchParams(body).toString() } : {}),
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new ConvexError('Payment provider request failed. Please try again.');
  return (await response.json()) as unknown;
}

const sessionPath = (sessionId: string) => `/checkout/sessions/${encodeURIComponent(sessionId)}`;

export async function retrieveSession(sessionId: string) {
  return sessionSchema.parse(await stripeFetch(sessionPath(sessionId)));
}

function tripReturnUrl(shortId: string): string {
  const site = new URL(env.SITE_URL ?? 'http://localhost:5173');
  const local = ['localhost', '127.0.0.1'].includes(site.hostname);
  const base = site.pathname === '/' ? (local ? '' : '/app') : site.pathname.replace(/\/$/u, '');
  return new URL(`${base}/trips/${encodeURIComponent(shortId)}/board`, site.origin).href;
}

/** The request is deterministic per replaced session, so concurrent retries share one session. */
export async function createSession(payment: {
  id: Id<'tripPayments'>;
  sessionId: string | null;
  shortId: string;
}) {
  const tripUrl = tripReturnUrl(payment.shortId);
  const body = {
    mode: 'payment',
    success_url: tripUrl,
    cancel_url: tripUrl,
    'payment_method_types[0]': 'card',
    'line_items[0][price_data][currency]': TRIP_PRICE.currency,
    'line_items[0][price_data][unit_amount]': String(TRIP_PRICE.amount),
    'line_items[0][price_data][product_data][name]': 'Groam — one traveler, one trip',
    'line_items[0][quantity]': '1',
    'metadata[groamPaymentId]': payment.id,
    'metadata[groamDeployment]': deploymentTag()
  };
  const key = idempotencyKey('checkout', payment.id, payment.sessionId ?? 'first');
  return sessionSchema.parse(await stripeFetch('/checkout/sessions', body, key));
}

/** Best effort: a session paid despite expiry is refunded when its webhook arrives. */
export async function expireSession(sessionId: string) {
  try {
    await stripeFetch(`${sessionPath(sessionId)}/expire`, {});
  } catch {
    /* Already completed or expired. */
  }
}

export const expire = internalAction({
  args: { sessionId: v.string() },
  returns: v.null(),
  handler: async (_ctx, { sessionId }) => {
    await expireSession(sessionId);
    return null;
  }
});

/** Refunds a paid session that could not become a seat. The session-derived key makes retries safe. */
export const refund = internalAction({
  args: { sessionId: v.string(), attempt: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, { sessionId, attempt = 0 }) => {
    try {
      const session = await retrieveSession(sessionId);
      if (!session.payment_intent) throw new Error('Paid session has no payment intent');
      await stripeFetch(
        '/refunds',
        { payment_intent: session.payment_intent },
        idempotencyKey('refund', sessionId)
      );
    } catch (error) {
      const delay = REFUND_RETRY_DELAYS[attempt];
      if (delay === undefined) {
        console.error(`Refund for Stripe session ${sessionId} failed; refund it in Stripe.`, error);
      } else {
        await ctx.scheduler.runAfter(delay, internal.modules.payments.stripe.refund, {
          sessionId,
          attempt: attempt + 1
        });
      }
    }
    return null;
  }
});
