import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { setupWritableTrip, tripActivityInput, tripLocationInput } from '#testing/trips';

test('removes an itinerary activity and compacts the remaining order', async () => {
  const { owner, tripId } = await setupWritableTrip();
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, startDay: 1 }),
    tripId
  });
  const firstId = await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: tripActivityInput({ title: 'Breakfast market' }),
    tripId
  });
  const secondId = await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: tripActivityInput({ timeBlock: 'afternoon', title: 'Museum visit' }),
    tripId
  });

  await owner.client.mutation(api.routes.trips.destinations.activities.remove.run, {
    activityId: firstId,
    tripId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [
      {
        activities: [{ id: secondId, position: 0, title: 'Museum visit' }]
      }
    ]
  });
});

test('deleting a destination also removes its activities', async () => {
  const { owner, tripId } = await setupWritableTrip();
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: tripActivityInput(),
    tripId
  });

  await owner.client.mutation(api.routes.trips.destinations.remove.run, {
    destinationId,
    tripId
  });
  await expect(
    owner.client.run((ctx) => ctx.db.query('tripDestinationActivities').take(10))
  ).resolves.toEqual([]);
});
