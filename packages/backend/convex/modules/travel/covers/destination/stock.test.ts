import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import { pngBlob } from '#testing/media';
import { setupWritableTrip, tripLocationInput } from '#testing/trips';

const attribution = {
  creator: 'Public Domain Photographer',
  creatorUrl: 'https://example.com/photographer',
  license: 'CC0 1.0',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  sourceName: 'Wikimedia Commons',
  sourceUrl: 'https://example.com/photo',
  title: 'Lisbon skyline'
};

test('queues a stock photo for each destination using the trip-cover lookup', {
  timeout: 15_000
}, async () => {
  const { owner, tripId } = await setupWritableTrip();
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });

  await expect(
    owner.client.query(internal.modules.travel.covers.destination.stock.request, {
      destinationId,
      generation: 1
    })
  ).resolves.toEqual({
    excludedSourceUrl: null,
    query: 'Lisbon, Portugal'
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [{ coverStatus: 'pending', coverUrl: null, id: destinationId }]
  });
});

test('ensure backfills missing destination photos without touching ready stops', {
  timeout: 15_000
}, async () => {
  const { owner, tripId } = await setupWritableTrip();
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });
  const storageId = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  await owner.client.mutation(internal.modules.travel.covers.destination.stock.commit, {
    attribution,
    destinationId,
    generation: 1,
    storageId
  });
  const secondId = await owner.client.run(async (ctx) =>
    ctx.db.insert('tripDestinations', {
      coordinates: { latitude: 41.149_61, longitude: -8.610_99 },
      name: 'Porto, Portugal',
      placeId: 'R:3372207',
      position: 1,
      tripId
    })
  );

  await owner.client.mutation(api.routes.trips.destinations.covers.ensure.run, { tripId });

  const trip = await owner.client.query(api.routes.trips.get.run, { tripId });
  expect(trip.destinations).toMatchObject([
    { coverStatus: 'ready', coverUrl: expect.any(String), id: destinationId },
    { coverStatus: 'pending', coverUrl: null, id: secondId }
  ]);
});
