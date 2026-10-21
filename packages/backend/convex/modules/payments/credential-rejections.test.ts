import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { paymentReconciliationState, setupBillableTrip } from '#testing/payments';

const checkout = api.routes.trips.payments.checkout.run;
const rejected = (status = 401, code?: string) =>
  Response.json(
    { error: { type: 'invalid_request_error', ...(code ? { code } : {}) } },
    { status }
  );
const session = () =>
  Response.json({
    id: 'cs_corrected',
    url: 'https://checkout.stripe.com/c/pay/corrected',
    status: 'open',
    payment_status: 'unpaid',
    amount_total: 100,
    currency: 'eur',
    metadata: {}
  });
function configure() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_rejected');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_fixture');
}
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test.each([undefined, 'invalid_api_key', 'api_key_expired'])(
  'first definitive Stripe 401 (%s) permits a fresh attempt after credential correction',
  async (code) => {
    configure();
    const { tripId, users } = await setupBillableTrip(1);
    const member = users[0]!;
    const requests: Array<{ key: string | null; body: string }> = [];
    const provider = vi.fn(async (_url: string, init?: RequestInit) => {
      requests.push({
        key: new Headers(init?.headers).get('Idempotency-Key'),
        body: String(init?.body)
      });
      return requests.length === 1 ? rejected(401, code) : session();
    });
    vi.stubGlobal('fetch', provider);
    await expect(member.client.action(checkout, { tripId })).rejects.toThrow('credentials');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_corrected');
    expect(await member.client.action(checkout, { tripId })).toMatchObject({ skipped: false });
    expect(requests).toHaveLength(2);
    expect(requests[1]!.key).not.toBe(requests[0]!.key);
    expect(new URLSearchParams(requests[1]!.body).get('metadata[attempt]')).not.toBe(
      new URLSearchParams(requests[0]!.body).get('metadata[attempt]')
    );
  }
);

test('a timeout followed by 401 cannot erase an earlier ambiguous creation', async () => {
  configure();
  const { tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  const provider = vi.fn(async () => rejected());
  provider.mockRejectedValueOnce(new TypeError('response lost'));
  vi.stubGlobal('fetch', provider);
  await expect(member.client.action(checkout, { tripId })).rejects.toThrow('response lost');
  await expect(member.client.action(checkout, { tripId })).rejects.toThrow('credentials');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_corrected');
  await expect(member.client.action(checkout, { tripId })).rejects.toThrow('reconciliation');
  expect(provider).toHaveBeenCalledTimes(2);
});

test('concurrent requests invalidate first-request rejection proof and stale proof cannot renew', async () => {
  configure();
  const { tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  let release!: () => void;
  const both = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const provider = vi.fn(async () => {
    calls += 1;
    if (calls === 2) release();
    await both;
    return rejected();
  });
  vi.stubGlobal('fetch', provider);
  const results = await Promise.allSettled([
    member.client.action(checkout, { tripId }),
    member.client.action(checkout, { tripId })
  ]);
  expect(results.every((result) => result.status === 'rejected')).toBe(true);
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_corrected');
  await expect(member.client.action(checkout, { tripId })).rejects.toThrow('reconciliation');
  expect(provider).toHaveBeenCalledTimes(2);
});

test.each([403, 429, 500])(
  'Stripe %s remains ambiguous for credential rotation',
  async (status) => {
    configure();
    const { tripId, users } = await setupBillableTrip(1);
    const member = users[0]!;
    const provider = vi.fn(async () => rejected(status));
    vi.stubGlobal('fetch', provider);
    await expect(member.client.action(checkout, { tripId })).rejects.toThrow();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_corrected');
    await expect(member.client.action(checkout, { tripId })).rejects.toThrow('reconciliation');
    expect(provider).toHaveBeenCalledTimes(1);
  }
);

test('a stale rejection token cannot mark a replacement attempt as definitely rejected', async () => {
  configure();
  const { tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  const original = (await member.client.mutation(internal.modules.payments.storage.prepare, {
    tripId
  }))!;
  await member.client.mutation(internal.modules.payments.storage.recordRequest, {
    id: original.id,
    attempt: original.attempt,
    body: 'fixture',
    keyHash: 'fixture',
    requestToken: 'first'
  });
  expect(
    await member.client.mutation(internal.modules.payments.storage.recordCredentialRejection, {
      id: original.id,
      attempt: original.attempt,
      requestToken: 'first'
    })
  ).toBe(true);
  const replacement = (await member.client.mutation(internal.modules.payments.storage.prepare, {
    tripId
  }))!;
  expect(replacement.attempt).not.toBe(original.attempt);
  expect(
    await member.client.mutation(internal.modules.payments.storage.recordCredentialRejection, {
      id: original.id,
      attempt: original.attempt,
      requestToken: 'first'
    })
  ).toBe(false);
});

test.each(['definite', 'ambiguous'] as const)(
  'deletion keeps reconciliation only when credential rejection is %s',
  async (mode) => {
    configure();
    vi.useFakeTimers();
    const fixture = await setupBillableTrip(1);
    const member = fixture.users[0]!;
    const provider = vi.fn(async () => rejected());
    if (mode === 'ambiguous') provider.mockRejectedValueOnce(new TypeError('response lost'));
    vi.stubGlobal('fetch', provider);
    if (mode === 'ambiguous') {
      await expect(member.client.action(checkout, { tripId: fixture.tripId })).rejects.toThrow(
        'response lost'
      );
    }
    await expect(member.client.action(checkout, { tripId: fixture.tripId })).rejects.toThrow(
      'credentials'
    );
    expect(
      (
        await fixture.owner.authClient.organization.delete({
          organizationId: fixture.owner.organizationId!
        })
      ).error
    ).toBeNull();
    await fixture.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
    const receipts = await paymentReconciliationState(fixture.owner.test);
    expect(receipts).toHaveLength(mode === 'definite' ? 0 : 1);
    if (mode === 'definite') expect(provider).toHaveBeenCalledTimes(1);
  }
);
