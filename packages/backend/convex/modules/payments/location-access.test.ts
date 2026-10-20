import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { setupWritableTrip, tripLocationInput } from '#testing/trips';

afterEach(() => vi.unstubAllEnvs());

test('location searches hide unpaid draft coordinates and restore paid or disabled access', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_locations');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_locations');
  const { owner, users, tripId, sharedTripId } = await setupWritableTrip(1);
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
