import { vi } from 'vite-plus/test';
import type { Id } from '#convex-generated/dataModel';
import type { createTest } from '#testing/factory';

const WEBHOOK_SECRET = 'whsec_fixture';

export function enablePayments() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', WEBHOOK_SECRET);
}

export type FakeSession = {
  id: string;
  url: string | null;
  status: 'open' | 'complete' | 'expired';
  payment_status: 'paid' | 'unpaid';
  amount_total: number;
  currency: string;
  metadata: Record<string, string>;
  payment_intent: string | null;
  mode: 'payment';
};

function metadataOf(body: URLSearchParams) {
  return Object.fromEntries(
    [...body].flatMap(([name, value]) => {
      const field = /^metadata\[(.+)\]$/u.exec(name)?.[1];
      return field ? [[field, value]] : [];
    })
  );
}

/** An in-memory Stripe Checkout API: sessions, expiry, and idempotent refunds. */
export function stubStripe() {
  const sessions = new Map<string, FakeSession>();
  const created = new Map<string, FakeSession>();
  const state = { failRefunds: false, sessions, refundKeys: [] as string[] };

  const refund = (key: string | null) => {
    if (state.failRefunds) return Response.json({ error: {} }, { status: 500 });
    if (key && !state.refundKeys.includes(key)) state.refundKeys.push(key);
    return Response.json({ id: `re_${state.refundKeys.length}`, status: 'succeeded' });
  };
  const create = (body: URLSearchParams, key: string | null) => {
    const id = `cs_test_${sessions.size + 1}`;
    const session: FakeSession = (key && created.get(key)) || {
      id,
      url: `https://checkout.stripe.com/c/pay/${id}`,
      status: 'open',
      payment_status: 'unpaid',
      amount_total: Number(body.get('line_items[0][price_data][unit_amount]')),
      currency: body.get('line_items[0][price_data][currency]') ?? '',
      metadata: metadataOf(body),
      payment_intent: null,
      mode: 'payment'
    };
    sessions.set(session.id, session);
    if (key) created.set(key, session);
    return Response.json(session);
  };
  const existing = (path: string) => {
    const [, , , id, action] = path.split('/');
    const session = sessions.get(decodeURIComponent(id ?? ''));
    if (!session) return Response.json({ error: {} }, { status: 404 });
    if (action !== 'expire') return Response.json(session);
    if (session.status !== 'open') return Response.json({ error: {} }, { status: 400 });
    Object.assign(session, { status: 'expired', url: null });
    return Response.json(session);
  };

  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(input)).pathname.replace('/v1', '');
    const key = new Headers(init?.headers).get('Idempotency-Key');
    if (path === '/refunds') return refund(key);
    if (path === '/checkout/sessions') return create(new URLSearchParams(String(init?.body)), key);
    return existing(path);
  });
  return state;
}

/** Marks a fake session paid, as Stripe does once the traveler completes checkout. */
export function pay(session: FakeSession) {
  Object.assign(session, {
    status: 'complete',
    payment_status: 'paid',
    url: null,
    payment_intent: `pi_${session.id}`
  });
  return session;
}

async function sign(payload: string, timestamp: number, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const bytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`)
  );
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Delivers a signed `checkout.session.completed` event to the deployment's webhook. */
export async function deliverCompleted(
  test: ReturnType<typeof createTest>,
  session: Partial<FakeSession> & { id: string },
  { secret = WEBHOOK_SECRET, tamper = false } = {}
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    id: `evt_${crypto.randomUUID()}`,
    object: 'event',
    api_version: '2026-04-22.dahlia',
    type: 'checkout.session.completed',
    data: { object: session },
    created: timestamp,
    livemode: false,
    pending_webhooks: 1,
    request: null
  });
  const signature = await sign(payload, timestamp, secret);
  return test.fetch('/stripe/webhook', {
    method: 'POST',
    body: tamper ? payload.replace('checkout', 'Checkout') : payload,
    headers: {
      'stripe-signature': `t=${timestamp},v1=${signature}`,
      'content-type': 'application/json'
    }
  });
}

export function paymentRows(test: ReturnType<typeof createTest>, tripId: Id<'trips'>) {
  return test.run((ctx) =>
    ctx.db
      .query('tripPayments')
      .withIndex('by_tripId_and_userId', (query) => query.eq('tripId', tripId))
      .take(10)
  );
}
