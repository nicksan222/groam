import { z } from 'zod';
import {
  type Checkout,
  type CheckoutRequest,
  type PaymentProvider,
  PaymentProviderError,
  WebhookVerificationError
} from './provider';

export type StripeConfig = { secretKey: string; webhookSecret: string };

/** Stripe's default: older signed events are rejected as possible replays. */
const SIGNATURE_TOLERANCE_SECONDS = 300;

const sessionSchema = z.object({
  id: z.string(),
  url: z.string().nullable(),
  status: z.string().nullable(),
  payment_status: z.string(),
  amount_total: z.number().nullable(),
  currency: z.string().nullable(),
  payment_intent: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.string()).nullable().optional()
});

const eventSchema = z.object({ type: z.string(), data: z.object({ object: z.unknown() }) });

function toCheckout(session: z.infer<typeof sessionSchema>): Checkout {
  return {
    id: session.id,
    url: session.url,
    status: session.status === 'open' || session.status === 'expired' ? session.status : 'complete',
    paid: session.payment_status === 'paid',
    amount: session.amount_total,
    currency: session.currency,
    reference: session.metadata?.paymentReference,
    deployment: session.metadata?.deployment
  };
}

const sessionPath = (sessionId: string) => `/checkout/sessions/${encodeURIComponent(sessionId)}`;

function checkoutBody(request: CheckoutRequest) {
  return {
    mode: 'payment',
    success_url: request.returnUrl,
    cancel_url: request.returnUrl,
    'payment_method_types[0]': 'card',
    'line_items[0][price_data][currency]': request.price.currency,
    'line_items[0][price_data][unit_amount]': String(request.price.amount),
    'line_items[0][price_data][product_data][name]': request.description,
    'line_items[0][quantity]': '1',
    'metadata[paymentReference]': request.reference,
    'metadata[deployment]': request.deployment
  };
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

async function signatureOf(secret: string, signedPayload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload)));
}

/** Verifies a `Stripe-Signature` header (`t=<seconds>,v1=<hex>[,v1=<hex>]`) over the raw body. */
export async function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts = header.split(',').map((part) => part.split('=', 2) as [string, string?]);
  const timestamp = Number(parts.find(([name]) => name === 't')?.[1]);
  const candidates = parts.flatMap(([name, value]) => (name === 'v1' && value ? [value] : []));
  if (!Number.isInteger(timestamp) || !candidates.length)
    throw new WebhookVerificationError('Malformed signature header');
  if (Math.abs(Date.now() / 1000 - timestamp) > SIGNATURE_TOLERANCE_SECONDS)
    throw new WebhookVerificationError('Signature timestamp outside the tolerance');
  const expected = await signatureOf(secret, `${timestamp}.${payload}`);
  if (!candidates.some((candidate) => constantTimeEqual(candidate, expected)))
    throw new WebhookVerificationError('No signature matches the payload');
}

/** Stripe Checkout through its REST API; `fetch` is the only dependency. */
export function stripeProvider({ secretKey, webhookSecret }: StripeConfig): PaymentProvider {
  async function call(path: string, body?: Record<string, string>, idempotencyKey?: string) {
    // fallow-ignore-next-line security-sink -- fixed HTTPS Stripe API origin; callers only supply encoded IDs; redirects refused
    const response = await fetch(`https://api.stripe.com/v1${path}`, {
      method: body ? 'POST' : 'GET',
      redirect: 'error',
      headers: {
        authorization: `Bearer ${secretKey}`,
        ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
      },
      ...(body ? { body: new URLSearchParams(body).toString() } : {}),
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok)
      throw new PaymentProviderError('Payment provider request failed. Please try again.');
    return (await response.json()) as unknown;
  }
  const session = async (path: string, body?: Record<string, string>, key?: string) =>
    sessionSchema.parse(await call(path, body, key));

  return {
    name: 'Stripe',
    collects: true,
    createCheckout: async (request) =>
      toCheckout(
        await session('/checkout/sessions', checkoutBody(request), request.idempotencyKey)
      ),
    retrieveCheckout: async (id) => toCheckout(await session(sessionPath(id))),
    expireCheckout: async (id) => {
      try {
        await call(`${sessionPath(id)}/expire`, {});
      } catch {
        /* Already completed or expired. */
      }
    },
    refundCheckout: async (id, idempotencyKey) => {
      const { payment_intent } = await session(sessionPath(id));
      if (!payment_intent) throw new PaymentProviderError('Paid checkout has no payment intent');
      await call('/refunds', { payment_intent }, idempotencyKey);
    },
    completedCheckout: async (request) => {
      const payload = await request.text();
      await verifyStripeSignature(
        payload,
        request.headers.get('stripe-signature') ?? '',
        webhookSecret
      );
      const event = eventSchema.parse(JSON.parse(payload));
      if (event.type !== 'checkout.session.completed') return null;
      return toCheckout(sessionSchema.parse(event.data.object));
    }
  };
}
