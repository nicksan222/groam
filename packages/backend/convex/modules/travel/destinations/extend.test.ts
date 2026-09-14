import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import { setupWritableTrip, tripActivityInput, tripLocationInput } from '#testing/trips';

test('grows trip length and the stop so a new last day can take activities', {
  timeout: 15_000
}, async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 6, startDay: 1 }),
    tripId
  });

  await expect(
    owner.client.mutation(internal.modules.assistant.model.index.extendItinerary, {
      destinationId,
      extraDays: 1,
      tripId
    })
  ).resolves.toEqual({
    endDay: 7,
    extraDays: 1,
    startDay: 1,
    totalDurationDays: 7
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [{ endDay: 7, startDay: 1 }],
    totalDurationDays: 7
  });
  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: tripActivityInput({ dayNumber: 7, title: 'Night market' }),
      tripId
    })
  ).resolves.toEqual(expect.any(String));
});

test('refuses zero extra days and an unscheduled stop', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const scheduledId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, startDay: 1 }),
    tripId
  });
  const unscheduledId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({
      latitude: 41.149_61,
      longitude: -8.610_99,
      name: 'Porto, Portugal',
      placeId: 'R:3372207'
    }),
    tripId
  });

  await expect(
    owner.client.mutation(internal.modules.assistant.model.index.extendItinerary, {
      destinationId: scheduledId,
      extraDays: 0,
      tripId
    })
  ).rejects.toThrow('extra days must be between 1 and 14');
  await expect(
    owner.client.mutation(internal.modules.assistant.model.index.extendItinerary, {
      destinationId: unscheduledId,
      extraDays: 1,
      tripId
    })
  ).rejects.toThrow('no day range to extend');
});
