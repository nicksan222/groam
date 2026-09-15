import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { setupWritableTrip, tripLocationInput } from '#testing/trips';

test('queries synchronized trip, destination, and activity locations within the active organization', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  await owner.client.mutation(api.routes.trips.update.run, {
    input: {
      currency: 'EUR',
      destination: tripLocationInput({ latitude: 38.72, longitude: -9.14 }),
      name: 'Mapped Portugal'
    },
    tripId
  });
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({
      latitude: 38.721,
      longitude: -9.141,
      name: 'Lisbon center',
      placeId: 'lisbon-center'
    }),
    tripId
  });
  const activityId = await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: {
      coordinates: { latitude: 38.722, longitude: -9.142 },
      schedule: { day: 1, timeBlock: 'morning' },
      title: 'Mapped walk'
    },
    tripId
  });

  await expect(
    owner.client.query(api.routes.trips.locations.nearest.run, {
      limit: 5,
      maxDistance: 10_000,
      point: { latitude: 38.72, longitude: -9.14 },
      type: 'trip'
    })
  ).resolves.toEqual([
    expect.objectContaining({
      key: `trip:${tripId}`,
      coordinates: { latitude: 38.72, longitude: -9.14 }
    })
  ]);
  await expect(
    owner.client.query(api.routes.trips.locations.nearest.run, {
      limit: 5,
      maxDistance: 10_000,
      point: { latitude: 38.72, longitude: -9.14 },
      type: 'destination'
    })
  ).resolves.toEqual(
    expect.arrayContaining([expect.objectContaining({ key: `destination:${destinationId}` })])
  );
  await expect(
    owner.client.query(api.routes.trips.locations.nearest.run, {
      limit: 5,
      maxDistance: 10_000,
      point: { latitude: 38.72, longitude: -9.14 },
      type: 'activity'
    })
  ).resolves.toEqual([expect.objectContaining({ key: `activity:${activityId}` })]);

  await expect(
    owner.client.query(api.routes.trips.locations.region.run, {
      limit: 5,
      rectangle: { east: -9, north: 39, south: 38, west: -10 },
      type: 'activity'
    })
  ).resolves.toMatchObject({
    results: [
      { coordinates: { latitude: 38.722, longitude: -9.142 }, key: `activity:${activityId}` }
    ]
  });

  await owner.client.mutation(api.routes.trips.destinations.activities.update.run, {
    activityId,
    input: {
      schedule: { day: 1, timeBlock: 'afternoon' },
      title: 'Walk without coordinates'
    },
    tripId
  });
  await expect(
    owner.client.query(api.routes.trips.locations.nearest.run, {
      limit: 5,
      maxDistance: 10_000,
      point: { latitude: 38.72, longitude: -9.14 },
      type: 'activity'
    })
  ).resolves.toEqual([]);
});

test('validates geospatial query limits, distances, points, and rectangles', async () => {
  const { owner } = await setupWritableTrip(0);
  const nearest = (
    overrides: Partial<{ limit: number; maxDistance: number; latitude: number }> = {}
  ) =>
    owner.client.query(api.routes.trips.locations.nearest.run, {
      limit: overrides.limit ?? 5,
      maxDistance: overrides.maxDistance ?? 1_000,
      point: { latitude: overrides.latitude ?? 0, longitude: 0 },
      type: 'trip'
    });

  await expect(nearest({ limit: 0 })).rejects.toThrow(
    'Location result limit must be between 1 and 25'
  );
  await expect(nearest({ maxDistance: 0 })).rejects.toThrow(
    'Maximum distance must be between 1 and 1000000 meters'
  );
  await expect(nearest({ latitude: 91 })).rejects.toThrow(
    'search point latitude must be between -90 and 90'
  );
  await expect(
    owner.client.query(api.routes.trips.locations.region.run, {
      limit: 5,
      rectangle: { east: 1, north: 0, south: 1, west: 0 },
      type: 'trip'
    })
  ).rejects.toThrow('Location rectangle bounds are invalid');
});
