import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupBillableTrip } from '#testing/payments';
import { setupTrip } from '#testing/trips';

const paymentStatus = api.routes.trips.payments.status.run;
const checkout = api.routes.trips.payments.checkout.run;
const rsvp = api.routes.trips.travelers.set.run;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function configureStripe() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_fixture');
}

test('missing or blank Stripe key skips payment and keeps existing RSVP flow', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0]!;
  expect(await member.client.action(checkout, { tripId })).toEqual({ skipped: true, url: null });
  expect((await owner.client.query(paymentStatus, { tripId })).enabled).toBe(false);
  await member.client.mutation(rsvp, { tripId, status: 'going' });
  vi.stubEnv('STRIPE_SECRET_KEY', '  ');
  expect(await member.client.action(checkout, { tripId })).toEqual({ skipped: true, url: null });
});

test('enabling Stripe applies payment requirements to trips created without a key', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0]!;
  configureStripe();
  const status = await owner.client.query(paymentStatus, { tripId });
  expect(status.enabled).toBe(true);
  expect(status.travelers.find((traveler) => traveler.userId === member.userId)?.free).toBe(false);
  expect(status.travelers.find((traveler) => traveler.userId === owner.userId)?.free).toBe(true);
  await expect(member.client.mutation(rsvp, { tripId, status: 'going' })).rejects.toThrow('Pay €1');
  await expect(
    member.client.mutation(api.routes.trips.versions.create.run, { tripId })
  ).rejects.toThrow('Trip not found');
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  expect(await member.client.action(checkout, { tripId })).toEqual({ skipped: true, url: null });
  await member.client.mutation(rsvp, { tripId, status: 'going' });
});

test('billable trips exempt creator and refuse unpaid RSVP going', async () => {
  configureStripe();
  const { owner, tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  const status = await owner.client.query(paymentStatus, { tripId });
  expect(status).toMatchObject({ enabled: true });
  expect(status.travelers.find((t) => t.userId === owner.userId)?.free).toBe(true);
  expect(status.travelers.find((t) => t.userId === member.userId)).toMatchObject({
    free: false,
    paid: false
  });
  expect(await owner.client.action(checkout, { tripId })).toEqual({ skipped: true, url: null });
  await expect(member.client.mutation(rsvp, { tripId, status: 'going' })).rejects.toThrow('Pay €1');
  await expect(
    owner.client.mutation(rsvp, { tripId, userId: member.userId, status: 'going' })
  ).rejects.toThrow('Pay €1');
  await member.client.mutation(rsvp, { tripId, status: 'not_going' });
  const roster = await owner.client.query(api.routes.trips.travelers.list.run, { tripId });
  expect(roster.find((t) => t.userId === member.userId)?.status).toBe('not_going');
});

test('checkout enforces membership and sponsor permissions even without Stripe', async () => {
  const { owner, tripId, users } = await setupTrip(2);
  const outsider = await createOutsiderClient(owner.test);
  await expect(outsider.client.action(checkout, { tripId })).rejects.toThrow('Trip not found');
  await expect(
    users[0]!.client.action(checkout, { tripId, userId: users[1]!.userId })
  ).rejects.toThrow('Only organizers');
  await expect(owner.client.action(checkout, { tripId, userId: outsider.userId })).rejects.toThrow(
    'Traveler not found'
  );
});

test('a key without webhook configuration fails closed for billable trips', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
  const { tripId, users } = await setupBillableTrip(1);
  await expect(users[0]!.client.action(checkout, { tripId })).rejects.toThrow(
    'not fully configured'
  );
});

test('checkout retries use one fixed €1 session and signed webhook grants one seat', async () => {
  configureStripe();
  const { owner, tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  let metadata: { paymentId: string; attempt: string } | undefined;
  let session: Record<string, unknown>;
  const requests: Array<{ method: string; body: URLSearchParams; key: string | null }> = [];
  const stripeFetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = new URLSearchParams(String(init?.body ?? ''));
    requests.push({
      method: init?.method ?? 'GET',
      body,
      key: new Headers(init?.headers).get('Idempotency-Key')
    });
    if (init?.method === 'POST') {
      metadata = {
        paymentId: body.get('metadata[paymentId]')!,
        attempt: body.get('metadata[attempt]')!
      };
      session = {
        id: 'cs_test_seat',
        url: 'https://checkout.stripe.com/c/pay/seat',
        status: 'open',
        payment_status: 'unpaid',
        amount_total: 100,
        currency: 'eur',
        metadata,
        mode: 'payment'
      };
    }
    return new Response(JSON.stringify(session!), {
      headers: { 'content-type': 'application/json' }
    });
  });
  vi.stubGlobal('fetch', stripeFetch);
  const first = await member.client.action(checkout, { tripId });
  expect(first).toEqual({ skipped: false, url: 'https://checkout.stripe.com/c/pay/seat' });
  expect(requests[0]!.body.get('line_items[0][price_data][unit_amount]')).toBe('100');
  expect(requests[0]!.body.get('line_items[0][price_data][currency]')).toBe('eur');
  expect(requests[0]!.key).toContain(metadata!.paymentId);
  expect(await member.client.action(checkout, { tripId })).toEqual(first);
  expect(requests.filter((r) => r.method === 'POST')).toHaveLength(1);
  await expect(owner.client.action(checkout, { tripId, userId: member.userId })).rejects.toThrow(
    'already paying'
  );
  expect(
    (await owner.client.query(paymentStatus, { tripId })).travelers.find(
      (t) => t.userId === member.userId
    )?.paid
  ).toBe(false);

  const event = {
    id: 'evt_seat',
    object: 'event',
    api_version: '2026-04-22.dahlia',
    type: 'checkout.session.completed',
    data: { object: { ...session!, status: 'complete', payment_status: 'paid' } },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: null
  };
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('whsec_fixture'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = Array.from(
    new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`))
    ),
    (b) => b.toString(16).padStart(2, '0')
  ).join('');
  const request = {
    method: 'POST',
    body: payload,
    headers: {
      'stripe-signature': `t=${timestamp},v1=${signature}`,
      'content-type': 'application/json'
    }
  };
  expect((await owner.test.fetch('/stripe/webhook', request)).status).toBe(200);
  expect((await owner.test.fetch('/stripe/webhook', request)).status).toBe(200);
  expect(
    (await owner.client.query(paymentStatus, { tripId })).travelers.find(
      (t) => t.userId === member.userId
    )?.paid
  ).toBe(true);
  expect(
    (await owner.client.query(api.routes.trips.travelers.list.run, { tripId })).find(
      (t) => t.userId === member.userId
    )?.status
  ).toBe('going');
  expect(await member.client.action(checkout, { tripId })).toEqual({ url: null, skipped: true });
});
