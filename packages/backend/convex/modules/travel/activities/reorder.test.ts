import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { setupWritableTrip, tripActivityInput, tripLocationInput } from '#testing/trips';

test('reorders activities by start day while preserving same-day order', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 4, startDay: 1 }),
    tripId
  });
  const addActivity = (dayNumber: number, title: string) =>
    owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: tripActivityInput({ dayNumber, title }),
      tripId
    });
  const dayTwoId = await addActivity(2, 'Day two');
  const firstDayThreeId = await addActivity(3, 'First day three');
  await owner.client.mutation(api.routes.trips.destinations.activities.transfers.set.run, {
    fromActivityId: dayTwoId,
    input: { mode: 'walk' },
    toActivityId: firstDayThreeId,
    tripId
  });
  await addActivity(1, 'Day one');
  await addActivity(3, 'Second day three');

  await owner.client.mutation(api.routes.trips.destinations.activities.reorder.run, {
    destinationId,
    tripId
  });

  const trip = await owner.client.query(api.routes.trips.get.run, { tripId });
  expect(trip.destinations[0]?.activities).toMatchObject([
    { dayNumber: 1, position: 0, title: 'Day one' },
    { dayNumber: 2, position: 1, title: 'Day two' },
    { dayNumber: 3, position: 2, title: 'First day three' },
    { dayNumber: 3, position: 3, title: 'Second day three' }
  ]);
  expect(trip.destinations[0]?.activities[1]?.transferToNext).not.toBeNull();
});

test('removes travel that no longer connects neighboring activities after reordering', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, startDay: 1 }),
    tripId
  });
  const addActivity = (dayNumber: number, title: string) =>
    owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: tripActivityInput({ dayNumber, title }),
      tripId
    });
  const dayOneId = await addActivity(1, 'Day one');
  const dayThreeId = await addActivity(3, 'Day three');
  await owner.client.mutation(api.routes.trips.destinations.activities.transfers.set.run, {
    fromActivityId: dayOneId,
    input: { mode: 'walk' },
    toActivityId: dayThreeId,
    tripId
  });
  await addActivity(2, 'Day two');

  await owner.client.mutation(api.routes.trips.destinations.activities.reorder.run, {
    destinationId,
    tripId
  });

  const trip = await owner.client.query(api.routes.trips.get.run, { tripId });
  expect(trip.destinations[0]?.activities.map(({ title }) => title)).toEqual([
    'Day one',
    'Day two',
    'Day three'
  ]);
  expect(
    trip.destinations[0]?.activities.every(({ transferToNext }) => transferToNext === null)
  ).toBe(true);
});
