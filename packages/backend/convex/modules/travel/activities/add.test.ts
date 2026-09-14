import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import {
  setupGroup,
  setupWritableTrip,
  tripActivityInput,
  tripLocationInput
} from '#testing/trips';

test('adds ordered activities to a scheduled destination', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupWritableTrip();
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, startDay: 1 }),
    tripId
  });
  const activityId = await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: tripActivityInput({
      address: 'Rue de Rivoli, 75001 Paris, France',
      dayNumber: 2,
      timeBlock: 'afternoon'
    }),
    tripId
  });

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [
      {
        activities: [
          {
            address: 'Rue de Rivoli, 75001 Paris, France',
            dayNumber: 2,
            id: activityId,
            notes: 'Book ahead',
            position: 0,
            timeBlock: 'afternoon',
            title: 'Walking tour'
          }
        ]
      }
    ]
  });
});

test('adds an activity spanning multiple destination days', async () => {
  const { owner, tripId } = await setupWritableTrip();
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 4, startDay: 1 }),
    tripId
  });

  const activityId = await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: tripActivityInput({
      dayNumber: 2,
      endDayNumber: 4,
      endTime: '08:30',
      startTime: '17:45',
      timeBlock: 'full_day'
    }),
    tripId
  });

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [
      {
        activities: [
          {
            dayNumber: 2,
            endDayNumber: 4,
            endTime: '08:30',
            id: activityId,
            startTime: '17:45'
          }
        ]
      }
    ]
  });
  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: tripActivityInput({ dayNumber: 3, endDayNumber: 2 }),
      tripId
    })
  ).rejects.toThrow('activity end day cannot be before its start day');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: tripActivityInput({
        endTime: '09:00',
        startTime: '10:00'
      }),
      tripId
    })
  ).rejects.toThrow('activity time end must be after its start');
});

test('adds a full-day activity with booking attachments', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, startDay: 1 }),
    tripId
  });
  const mediaId = await owner.client.run(async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob(['booking confirmation'], { type: 'application/pdf' })
    );
    return await ctx.db.insert('media', {
      contentType: 'application/pdf',
      createdBy: owner.userId,
      name: 'hotel-booking.pdf',
      organizationId: owner.organizationId!,
      size: 20,
      storageId
    });
  });

  const activityId = await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: tripActivityInput({
      attachmentIds: [mediaId],
      dayNumber: 2,
      timeBlock: 'full_day',
      title: 'Resort day'
    }),
    tripId
  });
  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: tripActivityInput({ attachmentIds: Array.from({ length: 6 }, () => mediaId) }),
      tripId
    })
  ).rejects.toThrow('Activities support up to 5 attachments');
  const outsider = await setupGroup();
  const foreignMediaId = await outsider.owner.client.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob(['foreign'], { type: 'application/pdf' }));
    return await ctx.db.insert('media', {
      contentType: 'application/pdf',
      createdBy: outsider.owner.userId,
      name: 'foreign-booking.pdf',
      organizationId: outsider.owner.organizationId!,
      size: 7,
      storageId
    });
  });
  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: tripActivityInput({ attachmentIds: [foreignMediaId] }),
      tripId
    })
  ).rejects.toThrow('Activity attachment not found');

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [
      {
        activities: [
          {
            attachments: [
              {
                contentType: 'application/pdf',
                id: mediaId,
                name: 'hotel-booking.pdf',
                url: expect.any(String)
              }
            ],
            dayNumber: 2,
            timeBlock: 'full_day',
            title: 'Resort day'
          }
        ]
      }
    ]
  });
  await expect(owner.client.mutation(api.routes.media.remove.run, { mediaId })).rejects.toThrow(
    'Remove this file from its trip before deleting it'
  );
  await owner.client.mutation(api.routes.trips.destinations.activities.remove.run, {
    activityId,
    tripId
  });
  await expect(owner.client.mutation(api.routes.media.remove.run, { mediaId })).resolves.toBeNull();
});

test('keeps activities inside the total trip timeline', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  await owner.client.mutation(api.routes.trips.update.run, {
    input: {
      currency: 'USD',
      destination: { status: 'undecided' },
      duration: { totalDays: 2 },
      name: 'Summer beach idea'
    },
    tripId
  });
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });

  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: tripActivityInput({ dayNumber: 3 }),
      tripId
    })
  ).rejects.toThrow('Activity day must fit within the 2-day trip');
});

test('enforces per-destination and per-trip activity limits', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });
  for (let index = 0; index < 30; index += 1) {
    await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: tripActivityInput({ title: `Activity ${index + 1}` }),
      tripId
    });
  }
  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: tripActivityInput({ title: 'One too many' }),
      tripId
    })
  ).rejects.toThrow('Destinations support up to 30 activities');

  const second = await setupWritableTrip(0);
  const targetDestinationId = await second.owner.client.run(async (ctx) => {
    const trip = await ctx.db.get('trips', second.tripId);
    if (!trip) throw new Error('Expected trip');
    const destinationIds = [];
    for (let destinationIndex = 0; destinationIndex < 7; destinationIndex += 1) {
      destinationIds.push(
        await ctx.db.insert('tripDestinations', {
          coordinates: {
            latitude: 40 + destinationIndex,
            longitude: -10 - destinationIndex
          },
          name: `Destination ${destinationIndex + 1}`,
          placeId: `limit-place-${destinationIndex + 1}`,
          position: destinationIndex,
          tripId: trip._id
        })
      );
    }
    for (let activityIndex = 0; activityIndex < 200; activityIndex += 1) {
      const destinationIndex = activityIndex % destinationIds.length;
      const destinationIdForActivity = destinationIds[destinationIndex];
      if (!destinationIdForActivity) throw new Error('Expected destination');
      await ctx.db.insert('tripDestinationActivities', {
        destinationId: destinationIdForActivity,
        position: Math.floor(activityIndex / destinationIds.length),
        schedule: { day: 1, timeBlock: 'morning' },
        title: `Activity ${activityIndex + 1}`,
        tripId: trip._id
      });
    }
    const firstDestinationId = destinationIds[0];
    if (!firstDestinationId) throw new Error('Expected target destination');
    return firstDestinationId;
  });
  await expect(
    second.owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId: targetDestinationId,
      input: tripActivityInput({ title: 'Trip overflow' }),
      tripId: second.tripId
    })
  ).rejects.toThrow('Trips support up to 200 itinerary activities');
});

test('validates activity text, coordinates, days, and direct attachment reads', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });
  const activityId = await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: tripActivityInput(),
    tripId
  });
  await expect(
    owner.client.query(api.routes.trips.attachments.list.run, {
      target: { id: activityId, type: 'activity' },
      tripId
    })
  ).resolves.toEqual([]);

  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: { ...tripActivityInput(), coordinates: { latitude: 91, longitude: 0 } },
      tripId
    })
  ).rejects.toThrow('activity latitude must be between -90 and 90');

  for (const [input, message] of [
    [tripActivityInput({ dayNumber: 1.5 }), 'activity day must be a whole number'],
    [
      tripActivityInput({ address: 'x'.repeat(241) }),
      'activity address must be 240 characters or fewer'
    ],
    [
      tripActivityInput({ notes: 'x'.repeat(241) }),
      'activity notes must be 240 characters or fewer'
    ],
    [tripActivityInput({ title: '   ' }), 'activity title must be between 1 and 100 characters']
  ] as const) {
    await expect(
      owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
        destinationId,
        input,
        tripId
      })
    ).rejects.toThrow(message);
  }
});

test('validates destination days and lets the trip creator add activities', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, startDay: 1 }),
    tripId
  });

  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: tripActivityInput({ dayNumber: 4 }),
      tripId
    })
  ).rejects.toThrow('must fall within the destination day range');
  await expect(
    owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: tripActivityInput(),
      tripId
    })
  ).resolves.toBeDefined();
});
