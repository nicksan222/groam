import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { setupBillableTrip } from '#testing/payments';
import { setupTrip } from '#testing/trips';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test('new trips require payment from noncreators whenever Stripe is enabled', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_activation');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_activation');
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0]!;
  const status = await owner.client.query(api.routes.trips.payments.status.run, { tripId });
  const roster = await owner.client.query(api.routes.trips.travelers.list.run, { tripId });
  expect(status.enabled).toBe(true);
  expect(status.travelers.find((traveler) => traveler.userId === member.userId)?.free).toBe(false);
  expect(roster.find((traveler) => traveler.userId === member.userId)?.status).toBe('invited');
  expect(status.travelers.find((traveler) => traveler.userId === owner.userId)?.free).toBe(true);
});

test.each(['', '  '])(
  'trips created without a usable Stripe key require payment when credentials are added later (%j)',
  async (key) => {
    vi.stubEnv('STRIPE_SECRET_KEY', key);
    const { owner, tripId, users } = await setupTrip(1);
    const member = users[0]!;
    expect(await member.client.action(api.routes.trips.payments.checkout.run, { tripId })).toEqual({
      skipped: true,
      url: null
    });
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_activation');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_activation');
    expect(
      (await owner.client.query(api.routes.trips.payments.status.run, { tripId })).enabled
    ).toBe(true);
    await expect(
      member.client.mutation(api.routes.trips.travelers.set.run, { tripId, status: 'going' })
    ).rejects.toThrow('Pay €1');
  }
);

test.each([undefined, '', '   '])(
  'incomplete webhook setup blocks checkout without exempting any trip (%j)',
  async (secret) => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_activation');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', secret);
    const { owner, tripId, users } = await setupTrip(1);
    const member = users[0]!;
    expect(
      (await owner.client.query(api.routes.trips.payments.status.run, { tripId })).enabled
    ).toBe(true);
    await expect(
      member.client.action(api.routes.trips.payments.checkout.run, { tripId })
    ).rejects.toThrow('Payments are not fully configured');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_activation');
    const status = await member.client.query(api.routes.trips.payments.status.run, { tripId });
    expect(status.enabled).toBe(true);
    expect(status.travelers.find((traveler) => traveler.userId === member.userId)?.free).toBe(
      false
    );
    await expect(
      member.client.mutation(api.routes.trips.travelers.set.run, { tripId, status: 'going' })
    ).rejects.toThrow('Pay €1');
  }
);

test('removing webhook readiness never grants free access to an already billable trip', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_activation');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_activation');
  const { tripId, users } = await setupBillableTrip(1);
  const member = users[0]!;
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', '   ');
  const provider = vi.fn();
  vi.stubGlobal('fetch', provider);
  const status = await member.client.query(api.routes.trips.payments.status.run, { tripId });
  expect(status.enabled).toBe(true);
  expect(status.travelers.find((traveler) => traveler.userId === member.userId)?.free).toBe(false);
  await expect(
    member.client.action(api.routes.trips.payments.checkout.run, { tripId })
  ).rejects.toThrow('Payments are not fully configured');
  await expect(
    member.client.mutation(api.routes.trips.travelers.set.run, { tripId, status: 'going' })
  ).rejects.toThrow('Pay €1');
  expect(provider).not.toHaveBeenCalled();
});
