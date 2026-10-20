import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import {
  paymentCleanupState,
  paymentReconciliationState,
  legacyUnrecordedPayment
} from '#testing/payments';
import { setupTrip } from '#testing/trips';
import { removeMember } from '#testing/waits';

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
    refundStatus: null as string | null,
    refundKeys: [] as string[],
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
      if (!state.refundKeys.includes(key)) {
        state.refundKeys.push(key);
        state.refundKey = key;
        state.refunds += 1;
      }
      if (state.loseRefund) {
        state.loseRefund = false;
        throw new TypeError('refund response lost');
      }
    }
    return Response.json({
      id: state.refunds > 1 ? `re_lifecycle_${state.refunds}` : 're_lifecycle',
      status: state.refundStatus ?? (state.refundPending ? 'pending' : 'succeeded')
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

test('already-confirmed seats are not refunded after archival and trip deletion', async () => {
  const { state, session } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  state.paid = true;
  state.status = 'complete';
  await fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId });
  expect((await paymentCleanupState(fixture.owner.test, fixture.tripId)).payments[0]!.paid).toBe(
    true
  );
  await fixture.owner.client.mutation(api.routes.trips.archive.run, { tripId: fixture.tripId });
  expect((await paidWebhook(fixture, session())).status).toBe(200);
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

test.each(['failed', 'canceled'] as const)(
  '%s refunds enter a bounded manual queue and never auto-retry',
  async (status) => {
    const { state, mock, session } = provider();
    vi.useFakeTimers();
    const fixture = await setupTrip(1);
    await fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId });
    state.race = true;
    state.refundStatus = status;
    await deleteOrganization(fixture);
    const row = (await paymentReconciliationState(fixture.owner.test))[0]!;
    expect(row.manualRefundStatus).toBe(status);
    const count = mock.mock.calls.length;
    await sweep(fixture);
    await fixture.owner.test.action(internal.modules.payments.reconciliation.run, { id: row._id });
    expect((await paidWebhook(fixture, session())).status).toBe(200);
    await fixture.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
    expect(mock).toHaveBeenCalledTimes(count);
    const manual = await fixture.owner.test.query(
      internal.modules.payments.reconciliation.listManual,
      { status, paginationOpts: { cursor: null, numItems: 25 } }
    );
    expect(manual.page).toMatchObject([
      { id: row._id, refundId: 're_lifecycle', status, generation: 0, history: [] }
    ]);
    expect(manual.page[0]).not.toHaveProperty('checkoutBody');
  }
);

test('explicit operator retry is CAS/idempotent and preserves failed receipt generations', async () => {
  const { state } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  await fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId });
  state.race = true;
  state.refundStatus = 'failed';
  await deleteOrganization(fixture);
  const row = (await paymentReconciliationState(fixture.owner.test))[0]!;
  const decision = {
    id: row._id,
    expectedRefundId: 're_lifecycle',
    requestId: 'support-case-2026-001'
  };
  await fixture.owner.test.mutation(
    internal.modules.payments.reconciliation.resumeManual,
    decision
  );
  await fixture.owner.test.mutation(
    internal.modules.payments.reconciliation.resumeManual,
    decision
  );
  await fixture.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  const retried = (await paymentReconciliationState(fixture.owner.test))[0]!;
  expect(state.refunds).toBe(2);
  expect(state.refundKeys[1]).toBe(`${state.refundKeys[0]}-retry-1`);
  expect(retried).toMatchObject({
    refundGeneration: 1,
    refundId: 're_lifecycle_2',
    manualRefundStatus: 'failed',
    refundHistory: [{ refundId: 're_lifecycle', status: 'failed', generation: 0 }]
  });
  await fixture.owner.test.mutation(
    internal.modules.payments.reconciliation.resumeManual,
    decision
  );
  await expect(
    fixture.owner.test.mutation(internal.modules.payments.reconciliation.resumeManual, {
      ...decision,
      requestId: 'support-case-2026-stale'
    })
  ).rejects.toThrow('changed');
  expect((await paymentReconciliationState(fixture.owner.test))[0]!.refundGeneration).toBe(1);
  const exhaustHistory = async (generation: number): Promise<void> => {
    if (generation > 10) return;
    const current = (await paymentReconciliationState(fixture.owner.test))[0]!;
    await fixture.owner.test.mutation(internal.modules.payments.reconciliation.resumeManual, {
      id: current._id,
      expectedRefundId: current.refundId!,
      requestId: `support-explicit-retry-${generation}`
    });
    await fixture.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
    await exhaustHistory(generation + 1);
  };
  await exhaustHistory(2);
  const exhausted = (await paymentReconciliationState(fixture.owner.test))[0]!;
  expect(exhausted.refundHistory).toHaveLength(10);
  await expect(
    fixture.owner.test.mutation(internal.modules.payments.reconciliation.resumeManual, {
      id: exhausted._id,
      expectedRefundId: exhausted.refundId!,
      requestId: 'support-explicit-retry-over-limit'
    })
  ).rejects.toThrow('exhausted');
  expect(state.refunds).toBe(11);
});

test('verified external remedies leave financial evidence and cannot be retried', async () => {
  const { state, mock } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  await fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId });
  state.race = true;
  state.refundStatus = 'canceled';
  await deleteOrganization(fixture);
  const row = (await paymentReconciliationState(fixture.owner.test))[0]!;
  const resolution = {
    id: row._id,
    expectedRefundId: 're_lifecycle',
    resolutionReference: 'verified-support-case-2026-1234'
  };
  await fixture.owner.test.mutation(
    internal.modules.payments.reconciliation.resolveManual,
    resolution
  );
  await fixture.owner.test.mutation(
    internal.modules.payments.reconciliation.resolveManual,
    resolution
  );
  const before = mock.mock.calls.length;
  await sweep(fixture);
  expect(mock).toHaveBeenCalledTimes(before);
  const retained = (await paymentReconciliationState(fixture.owner.test))[0]!;
  expect(retained).toMatchObject({
    refundId: 're_lifecycle',
    resolutionReference: resolution.resolutionReference,
    resolvedAt: expect.any(Number)
  });
  expect(
    (
      await fixture.owner.test.query(internal.modules.payments.reconciliation.listManual, {
        status: 'canceled',
        paginationOpts: { cursor: null, numItems: 25 }
      })
    ).page
  ).toEqual([]);
  await expect(
    fixture.owner.test.mutation(internal.modules.payments.reconciliation.resumeManual, {
      id: row._id,
      expectedRefundId: 're_lifecycle',
      requestId: 'another-operator-decision'
    })
  ).rejects.toThrow('changed');
});

test.each(['new', 'legacy'])(
  'a %s reservation without a persisted request uses only proven no-I/O cleanup',
  async (protocol) => {
    const { mock } = provider();
    vi.useFakeTimers();
    const fixture = await setupTrip(1);
    const reserved = await fixture.users[0]!.client.mutation(
      internal.modules.payments.storage.prepare,
      { tripId: fixture.tripId }
    );
    expect(reserved).not.toBeNull();
    if (protocol === 'legacy') await legacyUnrecordedPayment(fixture.owner.test, reserved!.id);
    await deleteOrganization(fixture);
    expect(mock).not.toHaveBeenCalled();
    expect(await paymentCleanupState(fixture.owner.test, fixture.tripId)).toEqual({
      tripExists: false,
      payments: []
    });
    expect(await paymentReconciliationState(fixture.owner.test)).toHaveLength(
      protocol === 'new' ? 0 : 1
    );
  }
);

test.each(['self', 'sponsor'])(
  'a removed traveler’s %s-paid Checkout is refunded without granting a seat',
  async (payer) => {
    const { state, session } = provider();
    vi.useFakeTimers();
    const fixture = await setupTrip(1);
    const traveler = fixture.users[0]!;
    const buyer = payer === 'sponsor' ? fixture.owner : traveler;
    await buyer.client.action(checkout, {
      tripId: fixture.tripId,
      ...(payer === 'sponsor' ? { userId: traveler.userId } : {})
    });
    await removeMember(fixture, traveler.userId);
    state.paid = true;
    state.status = 'complete';
    state.refundPending = true;
    expect((await paidWebhook(fixture, session())).status).toBe(200);
    expect((await paidWebhook(fixture, session())).status).toBe(200);
    expect((await paymentCleanupState(fixture.owner.test, fixture.tripId)).payments).toEqual([]);
    expect(await paymentReconciliationState(fixture.owner.test)).toHaveLength(1);
    await expect(
      traveler.client.query(api.routes.trips.get.run, { tripId: fixture.tripId })
    ).rejects.toThrow();
    await fixture.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
    expect(state.refunds).toBe(1);
    expect(await paymentReconciliationState(fixture.owner.test)).toHaveLength(1);
    state.refundPending = false;
    await sweep(fixture);
    expect(state.refunds).toBe(1);
    expect(await paymentReconciliationState(fixture.owner.test)).toEqual([]);
    expect((await paidWebhook(fixture, session())).status).toBe(200);
    await fixture.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
    expect(state.refunds).toBe(1);
  }
);

test('archiving before payment confirmation refunds the checkout and preserves archive/RSVP', async () => {
  const { state, session } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  await fixture.users[0]!.client.action(checkout, { tripId: fixture.tripId });
  await fixture.owner.client.mutation(api.routes.trips.archive.run, { tripId: fixture.tripId });
  const trip = await fixture.owner.client.query(api.routes.trips.get.run, {
    tripId: fixture.tripId
  });
  const travelers = await fixture.owner.client.query(api.routes.trips.travelers.list.run, {
    tripId: fixture.tripId
  });
  state.paid = true;
  state.status = 'complete';
  expect((await paidWebhook(fixture, session())).status).toBe(200);
  expect((await paidWebhook(fixture, session())).status).toBe(200);
  await fixture.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect(state.refunds).toBe(1);
  expect((await paymentCleanupState(fixture.owner.test, fixture.tripId)).payments).toEqual([]);
  expect(
    await fixture.owner.client.query(api.routes.trips.get.run, { tripId: fixture.tripId })
  ).toMatchObject({ archivedAt: trip!.archivedAt });
  expect(
    await fixture.owner.client.query(api.routes.trips.travelers.list.run, {
      tripId: fixture.tripId
    })
  ).toEqual(travelers);
});

test('completion with payments disabled preserves free access and queues refund until keys return', async () => {
  const { state, session, mock } = provider();
  vi.useFakeTimers();
  const fixture = await setupTrip(1);
  const member = fixture.users[0]!;
  await member.client.action(checkout, { tripId: fixture.tripId });
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  state.paid = true;
  state.status = 'complete';
  const calls = mock.mock.calls.length;
  expect((await paidWebhook(fixture, session())).status).toBe(200);
  expect((await paidWebhook(fixture, session())).status).toBe(200);
  await fixture.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
  expect(mock).toHaveBeenCalledTimes(calls);
  expect((await paymentCleanupState(fixture.owner.test, fixture.tripId)).payments).toEqual([]);
  expect(await paymentReconciliationState(fixture.owner.test)).toHaveLength(1);
  expect(await member.client.action(checkout, { tripId: fixture.tripId })).toEqual({
    skipped: true,
    url: null
  });
  expect(
    await member.client.query(api.routes.trips.get.run, { tripId: fixture.tripId })
  ).not.toBeNull();
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_lifecycle');
  await sweep(fixture);
  expect(state.refunds).toBe(1);
  expect(await paymentReconciliationState(fixture.owner.test)).toEqual([]);
});
