import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { setupTrip } from '#testing/trips';

afterEach(() => vi.unstubAllEnvs());

test('new trips stay free while payment infrastructure has no checkout frontend', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_activation');
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0]!;
  const status = await owner.client.query(api.routes.trips.payments.status.run, { tripId });
  const roster = await owner.client.query(api.routes.trips.travelers.list.run, { tripId });
  expect(status.enabled).toBe(false);
  expect(status.travelers.find((traveler) => traveler.userId === member.userId)?.free).toBe(true);
  expect(roster.find((traveler) => traveler.userId === member.userId)?.status).toBe('going');
  expect(status.travelers.find((traveler) => traveler.userId === owner.userId)?.free).toBe(true);
});

test.each(['', '  '])(
  'trips created without a usable Stripe key stay free when credentials are added later (%j)',
  async (key) => {
    vi.stubEnv('STRIPE_SECRET_KEY', key);
    const { owner, tripId, users } = await setupTrip(1);
    const member = users[0]!;
    expect(await member.client.action(api.routes.trips.payments.checkout.run, { tripId })).toEqual({
      skipped: true,
      url: null
    });
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_activation');
    expect(
      (await owner.client.query(api.routes.trips.payments.status.run, { tripId })).enabled
    ).toBe(false);
    await member.client.mutation(api.routes.trips.travelers.set.run, { tripId, status: 'going' });
  }
);
