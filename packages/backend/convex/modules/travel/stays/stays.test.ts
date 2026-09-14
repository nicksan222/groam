import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { setupWritableTrip, tripActivityInput, tripLocationInput } from '#testing/trips';

test('attaches costed stays and activities to the itinerary budget', async () => {
  const { owner, tripId } = await setupWritableTrip();
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 4, startDay: 1 }),
    tripId
  });
  const mediaId = await owner.client.run(async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob(['hotel confirmation'], { type: 'application/pdf' })
    );
    return await ctx.db.insert('media', {
      contentType: 'application/pdf',
      createdBy: owner.userId,
      name: 'hotel.pdf',
      organizationId: owner.organizationId!,
      size: 18,
      storageId
    });
  });
  const stayId = await owner.client.mutation(api.routes.trips.destinations.stays.add.run, {
    destinationId,
    input: {
      address: '1 River Road',
      attachmentIds: [mediaId],
      cost: { amount: 480 },
      notes: 'Breakfast included',
      schedule: {
        checkInDay: 1,
        checkInTime: '15:00',
        checkOutDay: 4,
        checkOutTime: '10:00'
      },
      title: 'Riverside Hotel'
    },
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: { ...tripActivityInput({ dayNumber: 2 }), cost: { amount: 35 } },
    tripId
  });

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [
      {
        activities: [{ costAmount: 35 }],
        stays: [
          {
            address: '1 River Road',
            attachments: [{ id: mediaId, name: 'hotel.pdf', url: expect.any(String) }],
            checkInDay: 1,
            checkInTime: '15:00',
            checkOutDay: 4,
            checkOutTime: '10:00',
            costAmount: 480,
            id: stayId,
            notes: 'Breakfast included',
            title: 'Riverside Hotel'
          }
        ]
      }
    ],
    totalPlannedCost: 515
  });

  await owner.client.mutation(api.routes.trips.destinations.stays.update.run, {
    input: {
      cost: { amount: 500 },
      schedule: { checkInDay: 1, checkOutDay: 4 },
      title: 'Riverside Hotel'
    },
    stayId,
    tripId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [{ stays: [{ costAmount: 500 }] }],
    totalPlannedCost: 535
  });

  await owner.client.mutation(api.routes.trips.destinations.stays.remove.run, { stayId, tripId });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [{ stays: [] }],
    totalPlannedCost: 35
  });
});

test('multiplies per-person stay costs by the group size', async () => {
  const { owner, tripId } = await setupWritableTrip(1);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, startDay: 1 }),
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.stays.add.run, {
    destinationId,
    input: {
      cost: { amount: 50, split: 'per_person' },
      schedule: { checkInDay: 1, checkOutDay: 3 },
      title: 'Shared loft'
    },
    tripId
  });

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [{ stays: [{ costAmount: 50, costSplit: 'per_person' }] }],
    totalPlannedCost: 100
  });
});

test('enforces stay ownership, member authorization, and destination day bounds', async () => {
  const { owner, tripId, sharedTripId, users } = await setupWritableTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a group member');
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, startDay: 1 }),
    tripId
  });
  const input = {
    cost: { amount: 0 },
    schedule: { checkInDay: 1, checkOutDay: 3 },
    title: 'Apartment'
  };

  await expect(
    owner.client.mutation(api.routes.trips.destinations.stays.add.run, {
      destinationId,
      input,
      tripId
    })
  ).resolves.toBeDefined();
  await expect(
    member.client.mutation(api.routes.trips.destinations.stays.add.run, {
      destinationId,
      input,
      tripId: sharedTripId
    })
  ).rejects.toThrow('permission to edit this trip');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.stays.add.run, {
      destinationId,
      input: { ...input, schedule: { checkInDay: 2, checkOutDay: 4 } },
      tripId
    })
  ).rejects.toThrow('stay days must fall within the destination day range');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.stays.add.run, {
      destinationId,
      input: { ...input, cost: { amount: -1 } },
      tripId
    })
  ).rejects.toThrow('stay cost must be between zero');
});
