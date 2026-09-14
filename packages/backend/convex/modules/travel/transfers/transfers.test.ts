import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import {
  openTripDraft,
  setupGroup,
  setupTransferEndpoints,
  setupWritableTrip,
  tripActivityInput,
  tripLocationInput
} from '#testing/trips';

async function createPdf(
  owner: Awaited<ReturnType<typeof setupGroup>>['owner'],
  name = 'ticket.pdf'
) {
  return await owner.client.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(['ticket'], { type: 'application/pdf' }));
    return await ctx.db.insert('media', {
      contentType: 'application/pdf',
      createdBy: owner.userId,
      name,
      organizationId: owner.organizationId!,
      size: 6,
      storageId
    });
  });
}

test('stores arrival and return travel around the destination route', {
  timeout: 15_000
}, async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });

  const arrivalId = await owner.client.mutation(api.routes.trips.transfers.set.run, {
    boundary: 'arrival',
    input: {
      cost: { amount: 220 },
      duration: { minutes: 120 },
      mode: 'flight',
      notes: 'Land at 09:20',
      timing: {
        endTime: '09:20',
        startDay: 1,
        startTime: '07:20'
      }
    },
    tripId
  });
  const departureId = await owner.client.mutation(api.routes.trips.transfers.set.run, {
    boundary: 'departure',
    input: { mode: 'train', notes: 'Night train home' },
    tripId
  });

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    arrivalTransfer: {
      costAmount: 220,
      durationMinutes: 120,
      id: arrivalId,
      mode: 'flight',
      notes: 'Land at 09:20',
      timing: {
        endDay: 1,
        endTime: '09:20',
        startDay: 1,
        startTime: '07:20'
      }
    },
    departureTransfer: {
      durationMinutes: null,
      id: departureId,
      mode: 'train',
      notes: 'Night train home'
    },
    totalDurationDays: 1,
    totalPlannedCost: 220
  });

  await owner.client.mutation(api.routes.trips.transfers.remove.run, {
    transferId: arrivalId,
    tripId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    arrivalTransfer: null,
    departureTransfer: { id: departureId }
  });

  await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ name: 'Porto', placeId: 'porto-boundary-change' }),
    tripId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    departureTransfer: null
  });
  await owner.client.mutation(api.routes.trips.transfers.set.run, {
    boundary: 'departure',
    input: { mode: 'flight' },
    tripId
  });
  const addedDestination = await owner.client.query(api.routes.trips.get.run, { tripId });
  const finalDestination = addedDestination.destinations[1];
  if (!finalDestination) throw new Error('Expected the added destination');
  await owner.client.mutation(api.routes.trips.destinations.remove.run, {
    destinationId: finalDestination.id,
    tripId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    departureTransfer: null
  });
});

test('stores typed destination and activity transfers with files', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const firstDestinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 2, startDay: 1 }),
    tripId
  });
  const secondDestinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({
      endDay: 4,
      latitude: 41.1579,
      longitude: -8.6291,
      name: 'Porto, Portugal',
      placeId: 'porto-place',
      startDay: 3
    }),
    tripId
  });
  const firstActivityId = await owner.client.mutation(
    api.routes.trips.destinations.activities.add.run,
    {
      destinationId: firstDestinationId,
      input: tripActivityInput({ title: 'Museum' }),
      tripId
    }
  );
  const secondActivityId = await owner.client.mutation(
    api.routes.trips.destinations.activities.add.run,
    {
      destinationId: firstDestinationId,
      input: tripActivityInput({ timeBlock: 'afternoon', title: 'Dinner' }),
      tripId
    }
  );
  const mediaId = await createPdf(owner);

  await expect(
    owner.client.mutation(api.routes.trips.transfers.set.run, {
      boundary: 'arrival',
      input: { mode: 'flight', timing: { startDay: 2, startTime: '08:00' } },
      tripId
    })
  ).rejects.toThrow('timing must fit');

  await expect(
    owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
      fromDestinationId: firstDestinationId,
      input: { mode: 'train', timing: { startDay: 1, startTime: '08:00' } },
      toDestinationId: secondDestinationId,
      tripId
    })
  ).rejects.toThrow('timing must fit between its connected itinerary elements');

  const destinationTransferId = await owner.client.mutation(
    api.routes.trips.destinations.transfers.set.run,
    {
      fromDestinationId: firstDestinationId,
      input: {
        attachmentIds: [mediaId],
        duration: { minutes: 165 },
        mode: 'train',
        notes: 'Reserved seats in carriage 4',
        timing: { endDay: 3, endTime: '09:00', startDay: 2, startTime: '08:00' }
      },
      toDestinationId: secondDestinationId,
      tripId
    }
  );
  const activityTransferId = await owner.client.mutation(
    api.routes.trips.destinations.activities.transfers.set.run,
    {
      fromActivityId: firstActivityId,
      input: {
        attachmentIds: [mediaId],
        duration: { minutes: 18 },
        mode: 'walk',
        notes: 'Follow the river',
        timing: { startDay: 1, startTime: '11:00' }
      },
      toActivityId: secondActivityId,
      tripId
    }
  );
  const beforeNoOp = await owner.client.run((ctx) =>
    ctx.db
      .query('tripAuditEvents')
      .withIndex('by_tripId', (query) => query.eq('tripId', tripId))
      .take(30)
  );
  await expect(
    owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
      fromDestinationId: firstDestinationId,
      input: {
        attachmentIds: [mediaId],
        duration: { minutes: 165 },
        mode: 'train',
        notes: 'Reserved seats in carriage 4',
        timing: { endDay: 3, endTime: '09:00', startDay: 2, startTime: '08:00' }
      },
      toDestinationId: secondDestinationId,
      tripId
    })
  ).resolves.toBe(destinationTransferId);
  await expect(
    owner.client.run((ctx) =>
      ctx.db
        .query('tripAuditEvents')
        .withIndex('by_tripId', (query) => query.eq('tripId', tripId))
        .take(30)
    )
  ).resolves.toEqual(beforeNoOp);

  await expect(
    owner.client.mutation(api.routes.trips.destinations.update.run, {
      destinationId: firstDestinationId,
      endDay: 3,
      startDay: 1,
      tripId
    })
  ).rejects.toThrow('Outgoing destination transfer timing');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.update.run, {
      activityId: firstActivityId,
      input: tripActivityInput({ endTime: '12:00', startTime: '08:00', title: 'Museum' }),
      tripId
    })
  ).rejects.toThrow('cannot depart before');

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [
      {
        activities: [
          {
            id: firstActivityId,
            transferToNext: {
              attachments: [{ id: mediaId, name: 'ticket.pdf', url: expect.any(String) }],
              durationMinutes: 18,
              id: activityTransferId,
              mode: 'walk',
              notes: 'Follow the river',
              toActivityId: secondActivityId
            }
          },
          { id: secondActivityId, transferToNext: null }
        ],
        id: firstDestinationId,
        transferToNext: {
          attachments: [{ id: mediaId, name: 'ticket.pdf', url: expect.any(String) }],
          durationMinutes: 165,
          id: destinationTransferId,
          mode: 'train',
          notes: 'Reserved seats in carriage 4',
          toDestinationId: secondDestinationId
        }
      },
      { id: secondDestinationId, transferToNext: null }
    ]
  });
  await expect(owner.client.mutation(api.routes.media.remove.run, { mediaId })).rejects.toThrow(
    'Remove this file from its trip before deleting it'
  );
  await owner.client.mutation(api.routes.trips.destinations.activities.transfers.remove.run, {
    transferId: activityTransferId,
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.transfers.remove.run, {
    transferId: destinationTransferId,
    tripId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [
      {
        activities: [
          { id: firstActivityId, transferToNext: null },
          { id: secondActivityId, transferToNext: null }
        ],
        id: firstDestinationId,
        transferToNext: null
      },
      { id: secondDestinationId, transferToNext: null }
    ]
  });
  await expect(owner.client.mutation(api.routes.media.remove.run, { mediaId })).resolves.toBeNull();
});

test('validates adjacency, limits, organization scope, and editing access', async () => {
  const { addUser, owner } = await setupGroup();
  const participant = await addUser('Transfer Participant');
  const sharedTripId = await owner.client.action(api.routes.trips.create.run, {
    input: {
      clientRequestId: crypto.randomUUID(),
      currency: 'USD',
      destination: { status: 'undecided' },
      name: 'Transfer validation'
    }
  });
  const { workingTripId: tripId } = await openTripDraft(owner, sharedTripId);
  const destinations = [];
  for (let index = 0; index < 3; index += 1) {
    destinations.push(
      await owner.client.mutation(api.routes.trips.destinations.add.run, {
        input: tripLocationInput({
          latitude: 38 + index,
          longitude: -9 - index,
          name: `Stop ${index + 1}`,
          placeId: `stop-${index + 1}`
        }),
        tripId
      })
    );
  }
  const [first, second, third] = destinations;
  if (!first || !second || !third) throw new Error('Expected destinations');

  await expect(
    owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
      fromDestinationId: first,
      input: { mode: 'flight' },
      toDestinationId: third,
      tripId
    })
  ).rejects.toThrow('must connect consecutive stops');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
      fromDestinationId: first,
      input: { duration: { minutes: 0 }, mode: 'bus' },
      toDestinationId: second,
      tripId
    })
  ).rejects.toThrow('transfer duration must be a whole number');
  const mediaId = await createPdf(owner, 'validation-ticket.pdf');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
      fromDestinationId: first,
      input: { attachmentIds: Array.from({ length: 6 }, () => mediaId), mode: 'bus' },
      toDestinationId: second,
      tripId
    })
  ).rejects.toThrow('Transfers support up to 5 attachments');
  const foreignMediaId = await owner.client.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(['foreign'], { type: 'application/pdf' }));
    return await ctx.db.insert('media', {
      contentType: 'application/pdf',
      createdBy: 'foreign-user',
      name: 'foreign.pdf',
      organizationId: 'foreign-organization',
      size: 7,
      storageId
    });
  });
  await expect(
    owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
      fromDestinationId: first,
      input: { attachmentIds: [foreignMediaId], mode: 'bus' },
      toDestinationId: second,
      tripId
    })
  ).rejects.toThrow('Transfer attachment not found');
  await expect(
    participant.client.mutation(api.routes.trips.destinations.transfers.set.run, {
      fromDestinationId: first,
      input: { mode: 'train' },
      toDestinationId: second,
      tripId: sharedTripId
    })
  ).rejects.toThrow('permission');

  const outsiderDestinationId = await owner.client.run(async (ctx) => {
    const outsiderTripId = await ctx.db.insert('trips', {
      clientRequestId: crypto.randomUUID(),
      creationFingerprint: 'foreign-test-trip',
      creator: { userId: 'foreign-user' },
      currency: 'USD',
      destination: { status: 'undecided' },
      name: 'Foreign trip',
      organizationId: 'foreign-organization',
      updatedAt: Date.now()
    });
    return await ctx.db.insert('tripDestinations', {
      coordinates: { latitude: 50, longitude: 10 },
      name: 'Foreign stop',
      placeId: 'foreign-stop',
      position: 0,
      tripId: outsiderTripId
    });
  });
  await expect(
    owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
      fromDestinationId: first,
      input: { mode: 'train' },
      toDestinationId: outsiderDestinationId,
      tripId
    })
  ).rejects.toThrow('Trip destination not found');
});

test('updates existing transfers, their attachments, and validation paths', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const { firstActivityId, firstDestinationId, secondActivityId, secondDestinationId } =
    await setupTransferEndpoints(owner, tripId);
  const otherStopActivityId = await owner.client.mutation(
    api.routes.trips.destinations.activities.add.run,
    {
      destinationId: secondDestinationId,
      input: tripActivityInput({ title: 'Other stop activity' }),
      tripId
    }
  );
  const mediaId = await createPdf(owner, 'updated-transfer.pdf');
  await owner.client.mutation(api.routes.trips.destinations.activities.update.run, {
    activityId: firstActivityId,
    input: tripActivityInput({ endTime: '10:00', startTime: '08:00' }),
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.activities.update.run, {
    activityId: secondActivityId,
    input: tripActivityInput({ startTime: '11:00', title: 'Second activity' }),
    tripId
  });
  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.transfers.set.run, {
      fromActivityId: firstActivityId,
      input: { mode: 'walk', timing: { startDay: 1, startTime: '09:00' } },
      toActivityId: secondActivityId,
      tripId
    })
  ).rejects.toThrow('cannot depart before');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.transfers.set.run, {
      fromActivityId: firstActivityId,
      input: {
        mode: 'walk',
        timing: { endTime: '12:00', startDay: 1, startTime: '10:00' }
      },
      toActivityId: secondActivityId,
      tripId
    })
  ).rejects.toThrow('cannot arrive after');

  const destinationTransferId = await owner.client.mutation(
    api.routes.trips.destinations.transfers.set.run,
    {
      fromDestinationId: firstDestinationId,
      input: { mode: 'train' },
      toDestinationId: secondDestinationId,
      tripId
    }
  );
  await owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
    fromDestinationId: firstDestinationId,
    input: { attachmentIds: [mediaId], mode: 'train' },
    toDestinationId: secondDestinationId,
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
    fromDestinationId: firstDestinationId,
    input: { attachmentIds: [mediaId], duration: { minutes: 45 }, mode: 'bus', notes: ' Changed ' },
    toDestinationId: secondDestinationId,
    tripId
  });

  const activityTransferId = await owner.client.mutation(
    api.routes.trips.destinations.activities.transfers.set.run,
    {
      fromActivityId: firstActivityId,
      input: { mode: 'walk' },
      toActivityId: secondActivityId,
      tripId
    }
  );
  await owner.client.mutation(api.routes.trips.destinations.activities.transfers.set.run, {
    fromActivityId: firstActivityId,
    input: { attachmentIds: [mediaId], mode: 'walk' },
    toActivityId: secondActivityId,
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.activities.transfers.set.run, {
    fromActivityId: firstActivityId,
    input: { attachmentIds: [mediaId], duration: { minutes: 10 }, mode: 'bicycle' },
    toActivityId: secondActivityId,
    tripId
  });

  await expect(
    Promise.all([
      owner.client.query(api.routes.trips.attachments.list.run, {
        target: { id: activityTransferId, type: 'activity_transfer' },
        tripId
      }),
      owner.client.query(api.routes.trips.attachments.list.run, {
        target: { id: destinationTransferId, type: 'destination_transfer' },
        tripId
      })
    ])
  ).resolves.toMatchObject([[{ mediaId }], [{ mediaId }]]);
  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.transfers.set.run, {
      fromActivityId: firstActivityId,
      input: { mode: 'walk' },
      toActivityId: otherStopActivityId,
      tripId
    })
  ).rejects.toThrow('must connect consecutive activities at one stop');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
      fromDestinationId: firstDestinationId,
      input: { mode: 'train', notes: 'x'.repeat(501) },
      toDestinationId: secondDestinationId,
      tripId
    })
  ).rejects.toThrow('transfer notes must be 500 characters or fewer');

  await owner.client.mutation(api.routes.trips.destinations.activities.transfers.remove.run, {
    transferId: activityTransferId,
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.transfers.remove.run, {
    transferId: destinationTransferId,
    tripId
  });
  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.transfers.remove.run, {
      transferId: activityTransferId,
      tripId
    })
  ).rejects.toThrow('Activity transfer not found');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.transfers.remove.run, {
      transferId: destinationTransferId,
      tripId
    })
  ).rejects.toThrow('Destination transfer not found');
});
