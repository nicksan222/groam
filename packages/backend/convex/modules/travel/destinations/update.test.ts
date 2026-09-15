import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { approveTestTrip, setupWritableTrip, tripLocationInput } from '#testing/trips';

test('updates a stop plan and invalidates approvals for the previous itinerary', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });
  await approveTestTrip(owner, tripId);

  await owner.client.mutation(api.routes.trips.destinations.update.run, {
    dayNotes: '  Arrive, explore, and eat  ',
    destinationId,
    endDay: 3,
    startDay: 1,
    tripId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [{ dayNotes: 'Arrive, explore, and eat', endDay: 3, startDay: 1 }]
  });
});

test('keeps every existing activity inside a newly assigned destination schedule', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: {
      schedule: { day: 5, timeBlock: 'morning' },
      title: 'Day five activity'
    },
    tripId
  });

  await expect(
    owner.client.mutation(api.routes.trips.destinations.update.run, {
      destinationId,
      endDay: 3,
      startDay: 1,
      tripId
    })
  ).rejects.toThrow('destination schedule must include every existing activity day');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.update.run, {
      destinationId,
      endDay: 6,
      startDay: 4,
      tripId
    })
  ).resolves.toBeNull();
});

test('keeps route schedules chronological while allowing same-day handoffs', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const firstDestinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 4, startDay: 1 }),
    tripId
  });
  const secondDestinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({
      endDay: 6,
      latitude: 41.149_61,
      longitude: -8.610_99,
      name: 'Porto, Portugal',
      placeId: 'R:3372207',
      startDay: 4
    }),
    tripId
  });

  await expect(
    owner.client.mutation(api.routes.trips.destinations.update.run, {
      destinationId: secondDestinationId,
      endDay: 6,
      startDay: 3,
      tripId
    })
  ).rejects.toThrow('cannot start before day 4');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.update.run, {
      destinationId: firstDestinationId,
      endDay: 5,
      startDay: 1,
      tripId
    })
  ).rejects.toThrow('cannot start before day 5');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.update.run, {
      destinationId: secondDestinationId,
      endDay: 6,
      startDay: 4,
      tripId
    })
  ).resolves.toBeNull();
});

test('validates stop notes atomically and lets the trip creator update the plan', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });

  await expect(
    owner.client.mutation(api.routes.trips.destinations.update.run, {
      dayNotes: 'x'.repeat(241),
      destinationId,
      endDay: 3,
      startDay: 1,
      tripId
    })
  ).rejects.toThrow('240 characters or fewer');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.update.run, {
      dayNotes: 'Backwards',
      destinationId,
      endDay: 2,
      startDay: 3,
      tripId
    })
  ).rejects.toThrow('end day cannot be before');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.update.run, {
      dayNotes: 'Changed by trip creator',
      destinationId,
      endDay: 3,
      startDay: 1,
      tripId
    })
  ).resolves.toBeNull();
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [{ dayNotes: 'Changed by trip creator' }]
  });
});
