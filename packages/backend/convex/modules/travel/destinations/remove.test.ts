import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import { setupWritableTrip, tripLocationInput } from '#testing/trips';

test('removes a stop, compacts itinerary order, and promotes the next primary destination', async () => {
  const { owner, tripId } = await setupWritableTrip();
  const firstId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });
  const secondId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({
      latitude: 41.149_61,
      longitude: -8.610_99,
      name: 'Porto, Portugal',
      placeId: 'R:3372207'
    }),
    tripId
  });

  await owner.client.mutation(api.routes.trips.destinations.remove.run, {
    destinationId: firstId,
    tripId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destination: { name: 'Porto, Portugal', status: 'known' },
    destinations: [{ id: secondId, position: 0 }]
  });
  await owner.client.mutation(api.routes.trips.destinations.remove.run, {
    destinationId: secondId,
    tripId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    coverAttribution: null,
    coverStatus: null,
    coverUrl: null,
    destination: { status: 'undecided' },
    destinations: []
  });
  await expect(
    owner.client.query(internal.modules.travel.covers.stock.request, {
      generation: 3,
      tripId
    })
  ).resolves.toBeNull();
});

test('rejects cross-group removal and lets the trip creator remove a destination', async () => {
  const first = await setupWritableTrip(0);
  const second = await setupWritableTrip(0);
  const destinationId = await first.owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId: first.tripId
  });

  await expect(
    second.owner.client.mutation(api.routes.trips.destinations.remove.run, {
      destinationId,
      tripId: second.tripId
    })
  ).rejects.toThrow('Trip destination not found');
  await expect(
    first.owner.client.mutation(api.routes.trips.destinations.remove.run, {
      destinationId,
      tripId: first.tripId
    })
  ).resolves.toBeNull();
});
