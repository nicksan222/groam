import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { confirmFixtureSeats, setupBillableWritableTrip } from '#testing/payments';
import { openTripDraft, tripInput, tripLocationInput } from '#testing/trips';

afterEach(() => vi.unstubAllEnvs());

test('location searches hide unpaid draft coordinates and restore paid or disabled access', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_locations');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_locations');
  const { owner, users, tripId, sharedTripId } = await setupBillableWritableTrip(1);
  const member = users[0]!;
  const point = { latitude: 38.72, longitude: -9.14 };
  await owner.client.mutation(api.routes.trips.update.run, {
    tripId,
    input: { currency: 'EUR', name: 'Private map', destination: tripLocationInput(point) }
  });
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    tripId,
    input: tripLocationInput({ ...point, name: 'Private destination', placeId: 'private-map-stop' })
  });
  await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    tripId,
    destinationId,
    input: { title: 'Private stop', coordinates: point, schedule: { day: 1, timeBlock: 'morning' } }
  });
  const searches = async (viewer: typeof member, visible: boolean) => {
    for (const type of ['trip', 'destination', 'activity'] as const) {
      const nearest = await viewer.client.query(api.routes.trips.locations.nearest.run, {
        limit: 5,
        maxDistance: 10_000,
        point,
        type
      });
      const region = await viewer.client.query(api.routes.trips.locations.region.run, {
        limit: 5,
        rectangle: { east: -9, north: 39, south: 38, west: -10 },
        type
      });
      if (visible) {
        expect(nearest.length).toBeGreaterThan(0);
        expect(region.results.length).toBeGreaterThan(0);
      } else {
        expect(nearest).toEqual([]);
        expect(region.results).toEqual([]);
      }
    }
  };
  await searches(owner, true);
  await searches(member, false);
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  await searches(member, true);
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_locations');
  const payment = await owner.client.mutation(internal.modules.payments.storage.prepare, {
    tripId: sharedTripId,
    userId: member.userId
  });
  if (!payment) throw new Error('Expected a payment reservation');
  await owner.client.mutation(internal.modules.payments.storage.complete, {
    id: payment.id,
    attempt: payment.attempt,
    sessionId: 'cs_test_locations'
  });
  await searches(member, true);
});

test('nearest search fills its limit past inaccessible locations', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_locations');
  const { owner, users, tripId } = await setupBillableWritableTrip(1);
  const point = { latitude: 38.72, longitude: -9.14 };
  await owner.client.mutation(api.routes.trips.update.run, {
    tripId,
    input: { currency: 'EUR', name: 'Hidden nearest', destination: tripLocationInput(point) }
  });
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  const paidTrip = await owner.client.action(api.routes.trips.create.run, { input: tripInput() });
  const draft = await openTripDraft(owner, paidTrip);
  await owner.client.mutation(api.routes.trips.update.run, {
    tripId: draft.workingTripId,
    input: {
      currency: 'EUR',
      name: 'Visible farther',
      destination: tripLocationInput({ latitude: 38.73, longitude: -9.14 })
    }
  });
  await confirmFixtureSeats(owner, paidTrip, [users[0]!.userId]);
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_locations');
  const results = await users[0]!.client.query(api.routes.trips.locations.nearest.run, {
    limit: 1,
    maxDistance: 10_000,
    point,
    type: 'trip'
  });
  expect(results).toEqual([expect.objectContaining({ key: `trip:${draft.workingTripId}` })]);
});
