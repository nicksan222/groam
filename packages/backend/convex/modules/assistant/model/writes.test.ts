import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { setupTrip, setupWritableTrip, tripActivityInput, tripLocationInput } from '#testing/trips';

test(
  'patches itinerary items, travel, and trip details on a draft idea',
  {
    timeout: 20_000
  },
  async () => {
    const { owner, tripId } = await setupWritableTrip(0);
    const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput({ endDay: 3, startDay: 1 }),
      tripId
    });
    const activityId = await owner.client.mutation(
      api.routes.trips.destinations.activities.add.run,
      {
        destinationId,
        input: tripActivityInput({ dayNumber: 1, title: 'Walking tour' }),
        tripId
      }
    );
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
  }
);

test('refuses assistant writes on the shared trip', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupTrip(0);
  await expect(
    owner.client.mutation(internal.modules.assistant.model.writes.updateTripDetails, {
      name: 'Should fail',
      tripId
    })
  ).rejects.toThrow('Only a draft idea can be written to');
});

async function setupDraftWithItems() {
  const { owner, tripId, ...rest } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 5, startDay: 1 }),
    tripId
  });
  const mediaId = await owner.client.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(['booking'], { type: 'application/pdf' }));
    return await ctx.db.insert('media', {
      contentType: 'application/pdf',
      createdBy: owner.userId,
      name: 'booking.pdf',
      organizationId: owner.organizationId!,
      size: 7,
      storageId
    });
  });
  return { destinationId, mediaId, owner, tripId, ...rest };
}

const coordinates = { latitude: 38.72, longitude: -9.14 };

test(
  'keeps attachments and coordinates when updating an activity or stay',
  { timeout: 20_000 },
  async () => {
    const { destinationId, mediaId, owner, tripId } = await setupDraftWithItems();
    const activityId = await owner.client.mutation(
      api.routes.trips.destinations.activities.add.run,
      {
        destinationId,
        input: {
          ...tripActivityInput({ attachmentIds: [mediaId], title: 'Walking tour' }),
          coordinates
        },
        tripId
      }
    );
    const stayId = await owner.client.mutation(api.routes.trips.destinations.stays.add.run, {
      destinationId,
      input: {
        attachmentIds: [mediaId],
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

    await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
      destinations: [
        {
          activities: [{ attachments: [{ id: mediaId }], id: activityId, title: 'Night market' }],
          stays: [{ attachments: [{ id: mediaId }], id: stayId, title: 'Riverside Hotel' }]
        }
      ]
    });
    const stored = await owner.client.run(async (ctx) => await ctx.db.get(activityId));
    expect(stored?.coordinates).toEqual(coordinates);
  }
);

test(
  'split-only cost patch changes the split and amount-only keeps it',
  { timeout: 20_000 },
  async () => {
    const { destinationId, owner, tripId } = await setupDraftWithItems();
    const stayId = await owner.client.mutation(api.routes.trips.destinations.stays.add.run, {
      destinationId,
      input: {
        cost: { amount: 100, split: 'total' },
        schedule: { checkInDay: 1, checkOutDay: 3 },
        title: 'Hotel Tejo'
      },
      tripId
    });
    const costOf = async () =>
      (await owner.client.run(async (ctx) => await ctx.db.get(stayId)))?.cost;

    await owner.client.mutation(internal.modules.assistant.model.writes.updateStay, {
      patch: { costSplit: 'per_person' },
      stayId,
      tripId
    });
    expect(await costOf()).toEqual({ amount: 100, split: 'per_person' });

    await owner.client.mutation(internal.modules.assistant.model.writes.updateStay, {
      patch: { costAmount: 150 },
      stayId,
      tripId
    });
    expect(await costOf()).toEqual({ amount: 150, split: 'per_person' });
  }
);

test(
  'persists startTime and shifts a multi-day activity endDay with its day',
  { timeout: 20_000 },
  async () => {
    const { destinationId, owner, tripId } = await setupDraftWithItems();
    const activityId = await owner.client.mutation(
      api.routes.trips.destinations.activities.add.run,
      {
        destinationId,
        input: tripActivityInput({ dayNumber: 1, endDayNumber: 2, title: 'Island hop' }),
        tripId
      }
    );
    await owner.client.mutation(internal.modules.assistant.model.writes.updateActivity, {
      activityId,
      patch: { startTime: '20:00' },
      tripId
    });
    const schedule = async () =>
      (await owner.client.run(async (ctx) => await ctx.db.get(activityId)))?.schedule;
    expect(await schedule()).toMatchObject({ day: 1, endDay: 2, startTime: '20:00' });

    await owner.client.mutation(internal.modules.assistant.model.writes.updateActivity, {
      activityId,
      patch: { day: 4 },
      tripId
    });
    expect(await schedule()).toMatchObject({ day: 4, endDay: 5, startTime: '20:00' });
  }
);

test('reauthorizes the writer on setItineraryCost', { timeout: 20_000 }, async () => {
  const { destinationId, owner, tripId, ...group } = await setupDraftWithItems();
  const stayId = await owner.client.mutation(api.routes.trips.destinations.stays.add.run, {
    destinationId,
    input: { schedule: { checkInDay: 1, checkOutDay: 2 }, title: 'Hotel Tejo' },
    tripId
  });
  const member = await group.addUser('Other member');
  await expect(
    member.client.mutation(internal.modules.assistant.model.index.setItineraryCost, {
      amount: 90,
      target: { id: stayId, type: 'stay' },
      tripId
    })
  ).rejects.toThrow();
  await owner.client.mutation(internal.modules.assistant.model.index.setItineraryCost, {
    amount: 90,
    target: { id: stayId, type: 'stay' },
    tripId
  });
  expect((await owner.client.run(async (ctx) => await ctx.db.get(stayId)))?.cost).toEqual({
    amount: 90,
    split: 'total'
  });
});
