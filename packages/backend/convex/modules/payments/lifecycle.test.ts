import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { paymentCleanupState, paymentReconciliationState } from '#testing/payments';
import { setupTrip } from '#testing/trips';

const checkout = api.routes.trips.payments.checkout.run;
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function provider() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_lifecycle');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_lifecycle');
  const state = {
    status: 'open',
    paid: false,
    race: false,
    lostCreation: false,
    loseRefund: false,
    refundPending: false,
    missingIntent: false,
    refunds: 0,
    expireCalls: 0,
    calls: [] as string[],
    metadata: {} as Record<string, string>,
    body: '',
    refundKey: '',
    beforeCreate: null as (() => Promise<void>) | null
  };
  const session = () => ({
    id: 'cs_lifecycle',
    url: state.status === 'open' ? 'https://checkout.stripe.com/c/pay/lifecycle' : null,
    status: state.status,
    payment_status: state.paid ? 'paid' : 'unpaid',
    amount_total: 100,
    currency: 'eur',
    metadata: state.metadata,
    payment_intent: state.paid && !state.missingIntent ? 'pi_lifecycle' : null
  });
  const refundResponse = (init?: RequestInit) => {
    if (init?.method === 'POST') {
      const key = new Headers(init.headers).get('Idempotency-Key')!;
      if (!state.refundKey) {
        state.refundKey = key;
        state.refunds += 1;
      }
      expect(key).toBe(state.refundKey);
      if (state.loseRefund) {
        state.loseRefund = false;
        throw new TypeError('refund response lost');
      }
    }
    return Response.json({
      id: 're_lifecycle',
      status: state.refundPending ? 'pending' : 'succeeded'
    });
  };
  const expireResponse = () => {
    state.expireCalls += 1;
    if (state.race) {
      state.paid = true;
      state.status = 'complete';
      return Response.json({ error: { param: 'status' } }, { status: 400 });
    }
    state.status = 'expired';
    return Response.json(session());
  };
  const createResponse = async (init: RequestInit) => {
    const body = new URLSearchParams(String(init.body));
    if (!state.body) {
      state.body = body.toString();
      state.metadata = {
        paymentId: body.get('metadata[paymentId]')!,
        attempt: body.get('metadata[attempt]')!
      };
    }
    expect(body.toString()).toBe(state.body);
    if (state.beforeCreate) await state.beforeCreate();
    if (state.lostCreation) {
      state.lostCreation = false;
      throw new TypeError('creation response lost');
    }
    return Response.json(session());
  };
  const mock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    state.calls.push(`${init?.method ?? 'GET'} ${url.pathname}`);
    if (url.pathname.startsWith('/v1/refunds')) return refundResponse(init);
    if (url.pathname.endsWith('/expire')) return expireResponse();
    if (init?.method === 'POST') return createResponse(init);
    return Response.json(session());
  });
  vi.stubGlobal('fetch', mock);
  return { state, mock, session };
}

async function deleteOrganization(fixture: Awaited<ReturnType<typeof setupTrip>>) {
  expect(
    (
      await fixture.owner.authClient.organization.delete({
        organizationId: fixture.owner.organizationId!
      })
    ).error
  ).toBeNull();
  await fixture.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
}
async function sweep(fixture: Awaited<ReturnType<typeof setupTrip>>) {
  vi.advanceTimersByTime(16 * 60_000);
  await fixture.owner.test.mutation(internal.modules.payments.reconciliation.sweep, {});
  await fixture.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
}

test('deletion expires attached open Checkout before removing its durable reconciliation receipt', async () => {
  const { state } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  await fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId });
  await deleteOrganization(fixture);
  expect(state.expireCalls).toBe(1);
  expect(state.status).toBe('expired');
  expect(state.refunds).toBe(0);
  expect(await paymentCleanupState(fixture.owner.test, fixture.tripId)).toEqual({
    tripExists: false,
    payments: []
  });
  expect(await paymentReconciliationState(fixture.owner.test)).toEqual([]);
});

test('a payment racing expiration is refunded and a lost refund response retries idempotently', async () => {
  const { state } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  await fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId });
  state.race = true;
  state.loseRefund = true;
  await deleteOrganization(fixture);
  expect(state.refunds).toBe(1);
  expect(await paymentReconciliationState(fixture.owner.test)).toHaveLength(1);
  await sweep(fixture);
  expect(state.refunds).toBe(1);
  expect(await paymentReconciliationState(fixture.owner.test)).toEqual([]);
});

test('already-confirmed seats are not refunded when their trip is deleted', async () => {
  const { state } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  state.paid = true;
  state.status = 'complete';
  await fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId });
  expect((await paymentCleanupState(fixture.owner.test, fixture.tripId)).payments[0]!.paid).toBe(
    true
  );
  await deleteOrganization(fixture);
  expect(state.refunds).toBe(0);
  expect(await paymentReconciliationState(fixture.owner.test)).toEqual([]);
});

test('lost creation responses replay exact original requests after deletion without personal identifiers', async () => {
  const { state } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  state.lostCreation = true;
  await expect(
    fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId })
  ).rejects.toThrow('creation response lost');
  const originalBody = state.body;
  vi.stubEnv('SITE_URL', 'https://changed.groam.example');
  await deleteOrganization(fixture);
  expect(state.body).toBe(originalBody);
  expect(state.status).toBe('expired');
  expect(state.refunds).toBe(0);
  expect(await paymentReconciliationState(fixture.owner.test)).toEqual([]);
});

test('removed credentials retain reconciliation until the correct key is restored', async () => {
  const { state, mock } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  await fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId });
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  await deleteOrganization(fixture);
  expect(mock).toHaveBeenCalledTimes(1);
  const rows = await paymentReconciliationState(fixture.owner.test);
  expect(rows).toHaveLength(1);
  expect(rows[0]).not.toHaveProperty('userId');
  expect(rows[0]).not.toHaveProperty('payerId');
  expect(JSON.stringify(rows[0])).not.toContain(fixture.users[0]!.userId);
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_lifecycle');
  await sweep(fixture);
  expect(state.expireCalls).toBe(1);
  expect(await paymentReconciliationState(fixture.owner.test)).toEqual([]);
});

test.each(['old', 'wrong-key'])(
  'unknown %s sessions remain durable without unsafe replay',
  async (reason) => {
    const { state, mock } = provider();
    vi.useFakeTimers();
    const fixture = await setupTrip(1);
    state.lostCreation = true;
    await expect(
      fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId })
    ).rejects.toThrow();
    if (reason === 'old') vi.advanceTimersByTime(24 * 3600_000);
    else vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_different_account');
    await deleteOrganization(fixture);
    expect(mock).toHaveBeenCalledTimes(1);
    expect(await paymentReconciliationState(fixture.owner.test)).toHaveLength(1);
  }
);

test('a late creation response attaches to the detached receipt without exposing a deleted trip URL', async () => {
  const { state } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  let release!: () => void;
  let entered!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  state.beforeCreate = async () => {
    entered();
    await gate;
  };
  const pending = fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId }).catch(
    (error: unknown) => error
  );
  await started;
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  await deleteOrganization(fixture);
  expect((await paymentReconciliationState(fixture.owner.test))[0]!.sessionId).toBeUndefined();
  release();
  expect(await pending).toMatchObject({ message: expect.stringContaining('no longer available') });
  await fixture.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect((await paymentReconciliationState(fixture.owner.test))[0]!.sessionId).toBe('cs_lifecycle');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_lifecycle');
  await sweep(fixture);
  expect(state.status).toBe('expired');
  expect(await paymentReconciliationState(fixture.owner.test)).toEqual([]);
});

test('pending refunds retain their receipt until Stripe confirms success', async () => {
  const { state } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  await fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId });
  state.race = true;
  state.refundPending = true;
  await deleteOrganization(fixture);
  expect((await paymentReconciliationState(fixture.owner.test))[0]!.refundId).toBe('re_lifecycle');
  state.refundPending = false;
  await sweep(fixture);
  expect(state.refunds).toBe(1);
  expect(state.calls).toContain('GET /v1/refunds/re_lifecycle');
  expect(await paymentReconciliationState(fixture.owner.test)).toEqual([]);
});

async function paidWebhook(
  fixture: Awaited<ReturnType<typeof setupTrip>>,
  session: ReturnType<ReturnType<typeof provider>['session']>
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    id: 'evt_lifecycle',
    object: 'event',
    api_version: '2026-04-22.dahlia',
    type: 'checkout.session.completed',
    created: timestamp,
    livemode: false,
    pending_webhooks: 1,
    request: null,
    data: { object: { ...session, mode: 'payment' } }
  });
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('whsec_lifecycle'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = Array.from(
    new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`))
    ),
    (byte) => byte.toString(16).padStart(2, '0')
  ).join('');
  return fixture.owner.test.fetch('/stripe/webhook', {
    method: 'POST',
    body: payload,
    headers: {
      'stripe-signature': `t=${timestamp},v1=${signature}`,
      'content-type': 'application/json'
    }
  });
}

test('a verified late payment invalidates a stale cleanup claim and refunds once', async () => {
  const { state, session } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  state.lostCreation = true;
  await expect(
    fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId })
  ).rejects.toThrow();
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  await deleteOrganization(fixture);
  const orphan = (await paymentReconciliationState(fixture.owner.test))[0]!;
  const claimed = await fixture.owner.test.mutation(
    internal.modules.payments.reconciliation.claim,
    { id: orphan._id }
  );
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_lifecycle');
  state.status = 'complete';
  state.paid = true;
  expect((await paidWebhook(fixture, session())).status).toBe(200);
  await fixture.owner.test.mutation(internal.modules.payments.reconciliation.finish, {
    id: orphan._id,
    leaseToken: claimed!.leaseToken!,
    revision: claimed!.revision,
    terminal: true
  });
  expect((await paymentReconciliationState(fixture.owner.test))[0]!.sessionId).toBe('cs_lifecycle');
  await fixture.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect(state.refunds).toBe(1);
  expect(await paymentReconciliationState(fixture.owner.test)).toEqual([]);
  expect((await paidWebhook(fixture, session())).status).toBe(200);
  await fixture.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect(state.refunds).toBe(1);
});

test('a lost successful refund remains durable if Stripe later prunes its idempotency response', async () => {
  const { state, mock } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  await fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId });
  state.race = true;
  state.loseRefund = true;
  await deleteOrganization(fixture);
  expect(state.refunds).toBe(1);
  vi.advanceTimersByTime(25 * 3600_000);
  const original = mock.getMockImplementation()!;
  mock.mockImplementation(async (url, init) =>
    url.includes('/v1/refunds') && init?.method === 'POST'
      ? Response.json({ error: { code: 'charge_already_refunded' } }, { status: 400 })
      : original(url, init)
  );
  await sweep(fixture);
  expect(state.refunds).toBe(1);
  expect(await paymentReconciliationState(fixture.owner.test)).toHaveLength(1);
});

test('unknown provider sessions do not become terminal on a 404', async () => {
  const { mock } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  await fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId });
  mock.mockImplementation(async () =>
    Response.json({ error: { code: 'resource_missing' } }, { status: 404 })
  );
  await deleteOrganization(fixture);
  const rows = await paymentReconciliationState(fixture.owner.test);
  expect(rows).toHaveLength(1);
  expect(rows[0]!.nextAttemptAt).toBeGreaterThan(Date.now());
});

test('an expired claim cannot remove a receipt owned by a replacement claim', async () => {
  provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  await fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId });
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  await deleteOrganization(fixture);
  const row = (await paymentReconciliationState(fixture.owner.test))[0]!;
  const first = await fixture.owner.test.mutation(internal.modules.payments.reconciliation.claim, {
    id: row._id
  });
  vi.advanceTimersByTime(3 * 60_000);
  const second = await fixture.owner.test.mutation(internal.modules.payments.reconciliation.claim, {
    id: row._id
  });
  expect(second!.leaseToken).not.toBe(first!.leaseToken);
  await fixture.owner.test.mutation(internal.modules.payments.reconciliation.finish, {
    id: row._id,
    leaseToken: first!.leaseToken!,
    revision: first!.revision,
    terminal: true
  });
  expect((await paymentReconciliationState(fixture.owner.test))[0]!.leaseToken).toBe(
    second!.leaseToken
  );
});

test('a recovered session ID survives incomplete reconciliation beyond the replay cutoff', async () => {
  const { state } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  state.lostCreation = true;
  await expect(
    fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId })
  ).rejects.toThrow();
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  await deleteOrganization(fixture);
  expect((await paymentReconciliationState(fixture.owner.test))[0]!.sessionId).toBeUndefined();
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_lifecycle');
  state.paid = true;
  state.status = 'complete';
  state.missingIntent = true;
  await sweep(fixture);
  expect((await paymentReconciliationState(fixture.owner.test))[0]!.sessionId).toBe('cs_lifecycle');
  expect(state.refunds).toBe(0);
  const callsBeforeCutoff = state.calls.length;
  vi.advanceTimersByTime(24 * 3600_000);
  state.missingIntent = false;
  await sweep(fixture);
  expect(state.calls.slice(callsBeforeCutoff)).toContain('GET /v1/checkout/sessions/cs_lifecycle');
  expect(state.calls.slice(callsBeforeCutoff)).not.toContain('POST /v1/checkout/sessions');
  expect(state.refunds).toBe(1);
  expect(await paymentReconciliationState(fixture.owner.test)).toEqual([]);
});
