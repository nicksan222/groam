import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import {
  approveTestTrip,
  setupWritableTrip,
  tripActivityInput,
  tripLocationInput
} from '#testing/trips';

async function setupActivity() {
  const trip = await setupWritableTrip(0);
  const destinationId = await trip.owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, startDay: 1 }),
    tripId: trip.tripId
  });
  const activityId = await trip.owner.client.mutation(
    api.routes.trips.destinations.activities.add.run,
    {
      destinationId,
      input: tripActivityInput(),
      tripId: trip.tripId
    }
  );
  return { ...trip, activityId };
}

test('skips no-op activity updates without extra activity history', async () => {
  const { activityId, owner, tripId } = await setupActivity();
  await approveTestTrip(owner, tripId);

  await owner.client.mutation(api.routes.trips.destinations.activities.update.run, {
    activityId,
    input: tripActivityInput(),
    tripId
  });

  const trip = await owner.client.query(api.routes.trips.get.run, { tripId });
  expect(trip.activity.some(({ type }) => type === 'itinerary_activity_updated')).toBe(false);
});

test('updates a destination activity', async () => {
  const { activityId, owner, tripId } = await setupActivity();
  await approveTestTrip(owner, tripId);

  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.update.run, {
      activityId,
      input: tripActivityInput({ address: 'x'.repeat(241) }),
      tripId
    })
  ).rejects.toThrow('activity address must be 240 characters or fewer');

  await owner.client.mutation(api.routes.trips.destinations.activities.update.run, {
    activityId,
    input: tripActivityInput({
      address: 'Cais do Sodré, 1200-450 Lisboa, Portugal',
      dayNumber: 2,
      endDayNumber: 3,
      notes: 'Meet at the riverside',
      timeBlock: 'evening',
      title: 'Sunset cruise'
    }),
    tripId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [
      {
        activities: [
          {
            address: 'Cais do Sodré, 1200-450 Lisboa, Portugal',
            dayNumber: 2,
            endDayNumber: 3,
            notes: 'Meet at the riverside',
            timeBlock: 'evening',
            title: 'Sunset cruise'
          }
        ]
      }
    ]
  });

  await owner.client.mutation(api.routes.trips.destinations.activities.update.run, {
    activityId,
    input: {
      schedule: { day: 3, timeBlock: 'evening' },
      title: 'Sunset cruise'
    },
    tripId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [
      {
        activities: [{ address: null, notes: null, title: 'Sunset cruise' }]
      }
    ]
  });
});
