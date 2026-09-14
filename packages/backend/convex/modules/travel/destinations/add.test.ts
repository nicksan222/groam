import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import { setupWritableTrip, tripLocationInput } from '#testing/trips';

test('appends verified destinations in itinerary order and sets the primary trip location', async () => {
  const { owner, tripId } = await setupWritableTrip();
  const lisbonId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({
      dayNotes: 'Food and old town',
      endDay: 3,
      startDay: 1
    }),
    tripId
  });
  await expect(
    owner.client.query(internal.modules.travel.covers.stock.request, {
      generation: 1,
      tripId
    })
  ).resolves.toMatchObject({ query: 'Lisbon, Portugal' });
  await expect(
    owner.client.query(internal.modules.travel.covers.destination.stock.request, {
      destinationId: lisbonId,
      generation: 1
    })
  ).resolves.toMatchObject({ query: 'Lisbon, Portugal' });
  await expect(owner.client.run((ctx) => ctx.db.get('trips', tripId))).resolves.toMatchObject({
    cover: { generation: 1, status: 'pending' }
  });
  const portoId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({
      dayNotes: 'River and cellars',
      endDay: 5,
      latitude: 41.149_61,
      longitude: -8.610_99,
      name: 'Porto, Portugal',
      placeId: 'R:3372207',
      startDay: 4
    }),
    tripId
  });

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destination: { name: 'Lisbon, Portugal', status: 'known' },
    destinations: [
      { dayNotes: 'Food and old town', endDay: 3, id: lisbonId, position: 0, startDay: 1 },
      { dayNotes: 'River and cellars', endDay: 5, id: portoId, position: 1, startDay: 4 }
    ]
  });
});

test('rejects an appended destination that travels backward in time', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 4, startDay: 2 }),
    tripId
  });

  await expect(
    owner.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput({
        endDay: 3,
        latitude: 41.149_61,
        longitude: -8.610_99,
        name: 'Porto, Portugal',
        placeId: 'R:3372207',
        startDay: 1
      }),
      tripId
    })
  ).rejects.toThrow('cannot start before day 4');
});

test('caps each trip at 20 destinations', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  for (let index = 0; index < 20; index += 1) {
    await owner.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput({
        latitude: 30 + index,
        longitude: -20 - index,
        name: `Destination ${index + 1}`,
        placeId: `destination-${index + 1}`
      }),
      tripId
    });
  }

  await expect(
    owner.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput({ name: 'Overflow', placeId: 'destination-overflow' }),
      tripId
    })
  ).rejects.toThrow('Trips support up to 20 destinations');
});

test('rejects duplicate and archived additions while keeping members from editing the shared trip', async () => {
  const { owner, tripId, sharedTripId, users } = await setupWritableTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a group member');
  await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });

  await expect(
    owner.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput(),
      tripId
    })
  ).rejects.toThrow('already on this trip');
  await expect(
    member.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput({ name: 'Porto', placeId: 'R:3372207' }),
      tripId: sharedTripId
    })
  ).rejects.toThrow('You do not have permission to edit this trip');
  await owner.client.mutation(api.routes.trips.archive.run, { tripId: sharedTripId });
  await expect(
    owner.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput({ name: 'Madrid', placeId: 'R:5326784' }),
      tripId: sharedTripId
    })
  ).rejects.toThrow('Archived trips are read-only');
});
