import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { setupWritableTrip, tripActivityInput, tripLocationInput } from '#testing/trips';

test('moves a stop earlier and shifts both schedules and activities with it', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const lisbonId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 2, startDay: 1 }),
    tripId
  });
  const portoId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({
      endDay: 5,
      latitude: 41.149_61,
      longitude: -8.610_99,
      name: 'Porto, Portugal',
      placeId: 'R:3372207',
      startDay: 3
    }),
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId: lisbonId,
    input: tripActivityInput({ dayNumber: 1, endDayNumber: 2, title: 'Lisbon activity' }),
    tripId
  });
  const portoActivityId = await owner.client.mutation(
    api.routes.trips.destinations.activities.add.run,
    {
      destinationId: portoId,
      input: tripActivityInput({ dayNumber: 3, endDayNumber: 4, title: 'Porto activity' }),
      tripId
    }
  );
  const portoDinnerId = await owner.client.mutation(
    api.routes.trips.destinations.activities.add.run,
    {
      destinationId: portoId,
      input: tripActivityInput({ dayNumber: 5, title: 'Porto dinner' }),
      tripId
    }
  );
  await owner.client.mutation(api.routes.trips.destinations.activities.transfers.set.run, {
    fromActivityId: portoActivityId,
    input: {
      mode: 'train',
      timing: { endDay: 5, endTime: '08:00', startDay: 4, startTime: '21:30' }
    },
    toActivityId: portoDinnerId,
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
    fromDestinationId: lisbonId,
    input: { mode: 'train' },
    toDestinationId: portoId,
    tripId
  });
  await owner.client.mutation(api.routes.trips.transfers.set.run, {
    boundary: 'arrival',
    input: { mode: 'flight' },
    tripId
  });
  await owner.client.mutation(api.routes.trips.transfers.set.run, {
    boundary: 'departure',
    input: { mode: 'train' },
    tripId
  });

  await owner.client.mutation(api.routes.trips.destinations.move.run, {
    destinationId: portoId,
    direction: 'earlier',
    tripId
  });

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    arrivalTransfer: null,
    departureTransfer: null,
    destination: { name: 'Porto, Portugal', status: 'known' },
    destinations: [
      {
        activities: [
          {
            dayNumber: 1,
            endDayNumber: 2,
            title: 'Porto activity',
            transferToNext: {
              timing: { endDay: 3, endTime: '08:00', startDay: 2, startTime: '21:30' }
            }
          },
          { dayNumber: 3, title: 'Porto dinner' }
        ],
        endDay: 3,
        id: portoId,
        position: 0,
        startDay: 1,
        transferToNext: null
      },
      {
        activities: [{ dayNumber: 4, endDayNumber: 5, title: 'Lisbon activity' }],
        endDay: 5,
        id: lisbonId,
        position: 1,
        startDay: 4
      }
    ]
  });
});

test('does nothing when moving a stop beyond the route boundary', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 2, startDay: 1 }),
    tripId
  });

  await expect(
    owner.client.mutation(api.routes.trips.destinations.move.run, {
      destinationId,
      direction: 'earlier',
      tripId
    })
  ).resolves.toBeNull();
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [{ id: destinationId, position: 0 }]
  });
});
