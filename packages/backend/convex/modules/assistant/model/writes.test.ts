import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { setupTrip, setupWritableTrip, tripActivityInput, tripLocationInput } from '#testing/trips';

test('patches itinerary items, travel, and trip details on a draft idea', {
  timeout: 20_000
}, async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, startDay: 1 }),
    tripId
  });
  const activityId = await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: tripActivityInput({ dayNumber: 1, title: 'Walking tour' }),
    tripId
  });
  const stayId = await owner.client.mutation(api.routes.trips.destinations.stays.add.run, {
    destinationId,
    input: {
      schedule: { checkInDay: 1, checkOutDay: 3 },
      title: 'Hotel Tejo'
    },
    tripId
  });

  await owner.client.mutation(internal.modules.assistant.model.writes.updateActivity, {
    activityId,
    patch: { title: 'Night market' },
    tripId
  });
  await owner.client.mutation(internal.modules.assistant.model.writes.updateStay, {
    patch: { title: 'Riverside Hotel' },
    stayId,
    tripId
  });
  await owner.client.mutation(internal.modules.assistant.model.writes.setDestinationSchedule, {
    destinationId,
    endDay: 4,
    startDay: 1,
    tripId
  });
  const portoId = await owner.client.mutation(
    internal.modules.assistant.model.writes.addDestination,
    {
      input: tripLocationInput({
        endDay: 6,
        latitude: 41.149_61,
        longitude: -8.610_99,
        name: 'Porto, Portugal',
        placeId: 'R:3372207',
        startDay: 5
      }),
      tripId
    }
  );
  const arrivalId = await owner.client.mutation(
    internal.modules.assistant.model.writes.setTransfer,
    {
      input: { mode: 'flight', notes: 'Land at 09:20' },
      target: { kind: 'arrival' },
      tripId
    }
  );
  await owner.client.mutation(internal.modules.assistant.model.writes.updateTripDetails, {
    name: 'Portugal extra day',
    totalDays: 6,
    tripId
  });

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    arrivalTransfer: { id: arrivalId, mode: 'flight' },
    destinations: [
      {
        activities: [{ id: activityId, title: 'Night market' }],
        endDay: 4,
        stays: [{ id: stayId, title: 'Riverside Hotel' }]
      },
      { id: portoId, name: 'Porto, Portugal', startDay: 5 }
    ],
    name: 'Portugal extra day',
    totalDurationDays: 6
  });

  await owner.client.mutation(internal.modules.assistant.model.writes.removeActivity, {
    activityId,
    tripId
  });
  await owner.client.mutation(internal.modules.assistant.model.writes.removeStay, {
    stayId,
    tripId
  });
  await owner.client.mutation(internal.modules.assistant.model.writes.removeTransfer, {
    target: { kind: 'arrival', transferId: arrivalId as Id<'tripBoundaryTransfers'> },
    tripId
  });
  await owner.client.mutation(internal.modules.assistant.model.writes.removeDestination, {
    destinationId: portoId,
    tripId
  });

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    arrivalTransfer: null,
    destinations: [{ activities: [], id: destinationId, stays: [] }]
  });
});

test('refuses assistant writes on the shared trip', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupTrip(0);
  await expect(
    owner.client.mutation(internal.modules.assistant.model.writes.updateTripDetails, {
      name: 'Should fail',
      tripId
    })
  ).rejects.toThrow('Only a draft idea can be written to');
});
