import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { setupBillableTrip, legacyUnrecordedPayment } from '#testing/payments';

const checkout = api.routes.trips.payments.checkout.run;
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function configure() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_fixture');
}
const session = (status = 'open') => ({
  id: 'cs_retry',
  url: 'https://checkout.stripe.com/c/pay/retry',
  status,
  payment_status: 'unpaid',
  amount_total: 100,
  currency: 'eur',
  metadata: {}
});
const expiredCreation = () => Response.json({ error: { param: 'expires_at' } }, { status: 400 });

// Only the external Stripe boundary is mocked; reservations/authentication use real routes.
test('definitively uncreated expired checkout renews once after a failed network request', async () => {
  configure();
  const { tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  const now = Date.now();
  const keys: Array<string | null> = [];
  const provider = vi.fn(async (_url: string, init?: RequestInit) => {
    keys.push(new Headers(init?.headers).get('Idempotency-Key'));
    if (keys.length === 1) throw new TypeError('network unavailable');
    if (keys.length === 2) return expiredCreation();
    const body = new URLSearchParams(String(init?.body));
    expect(Number(body.get('expires_at'))).toBeGreaterThan(Math.floor(Date.now() / 1000) + 1800);
    return Response.json(session());
  });
  vi.stubGlobal('fetch', provider);
  await expect(member.client.action(checkout, { tripId })).rejects.toThrow('network unavailable');
  vi.spyOn(Date, 'now').mockReturnValue(now + 31 * 60_000);
  expect(await member.client.action(checkout, { tripId })).toMatchObject({ skipped: false });
  expect(keys[0]).toBe(keys[1]);
  expect(keys[2]).not.toBe(keys[0]);
  expect(provider).toHaveBeenCalledTimes(3);
});

test('unknown sessions beyond idempotency retention fail closed without creating another charge', async () => {
  configure();
  const { tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  const now = Date.now();
  const provider = vi.fn(async () => {
    throw new TypeError('network unavailable');
  });
  vi.stubGlobal('fetch', provider);
  await expect(member.client.action(checkout, { tripId })).rejects.toThrow();
  vi.spyOn(Date, 'now').mockReturnValue(now + 24 * 3600_000);
  await expect(member.client.action(checkout, { tripId })).rejects.toThrow('reconciliation');
  expect(provider).toHaveBeenCalledTimes(1);
});

test('concurrent self retries share the exact Stripe request and idempotency key', async () => {
  configure();
  const { tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  let unblock!: () => void;
  const bothCreating = new Promise<void>((resolve) => {
    unblock = resolve;
  });
  const requests: Array<{ key: string | null; body: string }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        requests.push({
          key: new Headers(init.headers).get('Idempotency-Key'),
          body: String(init.body)
        });
        if (requests.length === 2) unblock();
        await bothCreating;
      }
      return Response.json(session());
    })
  );
  const results = await Promise.all([
    member.client.action(checkout, { tripId }),
    member.client.action(checkout, { tripId })
  ]);
  expect(results[0]).toEqual(results[1]);
  expect(requests).toHaveLength(2);
  expect(requests[0]).toEqual(requests[1]);
});

test('a sponsor cannot take an unattached checkout, but can reclaim a confirmed expired session', async () => {
  configure();
  const { owner, tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  let started!: () => void;
  let release!: () => void;
  const creating = new Promise<void>((resolve) => {
    started = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const provider = vi.fn(async () => {
    started();
    await gate;
    return Response.json(session());
  });
  vi.stubGlobal('fetch', provider);
  const pending = member.client.action(checkout, { tripId });
  await creating;
  try {
    await expect(owner.client.action(checkout, { tripId, userId: member.userId })).rejects.toThrow(
      'already paying'
    );
    expect(provider).toHaveBeenCalledTimes(1);
  } finally {
    release();
  }
  await pending;
  provider.mockImplementation(async (_url?: unknown, init?: RequestInit) =>
    Response.json(init?.method === 'GET' ? session('expired') : { ...session(), id: 'cs_sponsor' })
  );
  expect(await owner.client.action(checkout, { tripId, userId: member.userId })).toMatchObject({
    skipped: false
  });
  provider.mockImplementation(async () => Response.json({ ...session(), id: 'cs_sponsor' }));
  await expect(member.client.action(checkout, { tripId })).rejects.toThrow('already paying');
});

test('a lost creation response replays the paid session instead of charging again', async () => {
  configure();
  const { owner, tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  const now = Date.now();
  const keys: Array<string | null> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      keys.push(new Headers(init?.headers).get('Idempotency-Key'));
      if (keys.length === 1) throw new TypeError('response lost after Stripe accepted creation');
      return Response.json({ ...session('complete'), url: null, payment_status: 'paid' });
    })
  );
  await expect(member.client.action(checkout, { tripId })).rejects.toThrow('response lost');
  vi.spyOn(Date, 'now').mockReturnValue(now + 31 * 60_000);
  expect(await member.client.action(checkout, { tripId })).toEqual({ skipped: true, url: null });
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  expect(
    (await owner.client.query(api.routes.trips.payments.status.run, { tripId })).travelers.find(
      (traveler) => traveler.userId === member.userId
    )?.paid
  ).toBe(true);
});

test.each(['expired', 'uncreated'])(
  'a sponsor reconciles an abandoned unattached %s checkout after expiry',
  async (oldState) => {
    configure();
    const { owner, tripId, users } = await setupBillableTrip(1);
    const member = users[0]!;
    const now = Date.now();
    const keys: Array<string | null> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'GET')
          return Response.json({ ...session(), id: 'cs_sponsor_reconciled' });
        keys.push(new Headers(init?.headers).get('Idempotency-Key'));
        if (keys.length === 1) throw new TypeError('original payer lost response');
        if (keys.length === 2)
          return oldState === 'uncreated' ? expiredCreation() : Response.json(session('expired'));
        return Response.json({ ...session(), id: 'cs_sponsor_reconciled' });
      })
    );
    await expect(member.client.action(checkout, { tripId })).rejects.toThrow('lost response');
    vi.spyOn(Date, 'now').mockReturnValue(now + 61 * 60_000);
    expect(await owner.client.action(checkout, { tripId, userId: member.userId })).toMatchObject({
      skipped: false
    });
    expect(keys).toHaveLength(3);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
    await expect(member.client.action(checkout, { tripId })).rejects.toThrow('already paying');
  }
);

test('a sponsor reconciles a paid abandoned checkout without creating a second session', async () => {
  configure();
  const { owner, tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  const now = Date.now();
  const keys: Array<string | null> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      keys.push(new Headers(init?.headers).get('Idempotency-Key'));
      if (keys.length === 1) throw new TypeError('response lost');
      return Response.json({ ...session('complete'), url: null, payment_status: 'paid' });
    })
  );
  await expect(member.client.action(checkout, { tripId })).rejects.toThrow('response lost');
  vi.spyOn(Date, 'now').mockReturnValue(now + 61 * 60_000);
  expect(await owner.client.action(checkout, { tripId, userId: member.userId })).toEqual({
    skipped: true,
    url: null
  });
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  expect(
    (await owner.client.query(api.routes.trips.payments.status.run, { tripId })).travelers.find(
      (traveler) => traveler.userId === member.userId
    )?.paid
  ).toBe(true);
});

test('reconciliation never exposes an original payer open URL to a sponsor', async () => {
  configure();
  const { owner, tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  const now = Date.now();
  const provider = vi.fn(async () => Response.json(session()));
  provider.mockRejectedValueOnce(new TypeError('response lost'));
  vi.stubGlobal('fetch', provider);
  await expect(member.client.action(checkout, { tripId })).rejects.toThrow('response lost');
  vi.spyOn(Date, 'now').mockReturnValue(now + 61 * 60_000);
  await expect(owner.client.action(checkout, { tripId, userId: member.userId })).rejects.toThrow(
    'already paying'
  );
  expect(provider).toHaveBeenCalledTimes(2);
});

test('a sponsor also fails closed for an old ambiguous abandoned attempt', async () => {
  configure();
  const { owner, tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  const now = Date.now();
  const provider = vi.fn(async () => {
    throw new TypeError('response lost');
  });
  vi.stubGlobal('fetch', provider);
  await expect(member.client.action(checkout, { tripId })).rejects.toThrow('response lost');
  vi.spyOn(Date, 'now').mockReturnValue(now + 24 * 3600_000);
  await expect(owner.client.action(checkout, { tripId, userId: member.userId })).rejects.toThrow(
    'reconciliation'
  );
  expect(provider).toHaveBeenCalledTimes(1);
});

test.each(['self', 'sponsor'])(
  'an expired provably unsent attempt renews safely for %s after the replay cutoff',
  async (payer) => {
    configure();
    const { owner, tripId, users } = await setupBillableTrip(1);
    const member = users[0]!;
    const original = (await member.client.mutation(internal.modules.payments.storage.prepare, {
      tripId
    }))!;
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 24 * 3600_000);
    const provider = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = new URLSearchParams(String(init?.body));
      expect(body.get('metadata[attempt]')).not.toBe(original.attempt);
      expect(Number(body.get('expires_at'))).toBeGreaterThan(Date.now() / 1000);
      return Response.json(session());
    });
    vi.stubGlobal('fetch', provider);
    const buyer = payer === 'self' ? member : owner;
    expect(
      await buyer.client.action(checkout, {
        tripId,
        ...(payer === 'sponsor' ? { userId: member.userId } : {})
      })
    ).toMatchObject({ skipped: false });
    expect(provider).toHaveBeenCalledTimes(1);
    expect(
      await member.client.mutation(internal.modules.payments.storage.recordRequest, {
        id: original.id,
        attempt: original.attempt,
        body: 'stale',
        keyHash: 'stale'
      })
    ).toBeNull();
  }
);

test('legacy unsent-looking attempts remain ambiguous after the replay cutoff', async () => {
  configure();
  const { owner, tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  const original = (await member.client.mutation(internal.modules.payments.storage.prepare, {
    tripId
  }))!;
  await legacyUnrecordedPayment(owner.test, original.id);
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 24 * 3600_000);
  const provider = vi.fn();
  vi.stubGlobal('fetch', provider);
  await expect(member.client.action(checkout, { tripId })).rejects.toThrow('reconciliation');
  expect(provider).not.toHaveBeenCalled();
});
