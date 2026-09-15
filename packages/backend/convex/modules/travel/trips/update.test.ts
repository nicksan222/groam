import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { setupTrip, setupWritableTrip, tripLocationInput } from '#testing/trips';

const updateInput = {
  budget: { amount: 1800 },
  currency: 'EUR' as const,
  dateNotes: 'Early October',
  destination: {
    coordinates: { latitude: 41.1579, longitude: -8.6291 },
    countryCode: 'PT',
    name: 'Porto',
    placeId: 'porto-place',
    status: 'known' as const
  },
  duration: { idealDays: 7, minimumDays: 4, totalDays: 7 },
  name: 'Porto together',
  startDate: '2027-06-01'
};

test('allows the trip creator to update core details with activity history', async () => {
  const { owner, tripId } = await setupWritableTrip(0);

  await owner.client.mutation(api.routes.trips.update.run, {
    input: updateInput,
    tripId
  });
  const detail = await owner.client.query(api.routes.trips.get.run, { tripId });
  expect(detail).toMatchObject({
    currency: 'EUR',
    dateNotes: 'Early October',
    destination: { name: 'Porto', status: 'known' },
    destinations: [{ name: 'Porto', position: 0 }],
    idealDurationDays: 7,
    initialBudget: 1800,
    minimumDurationDays: 4,
    name: 'Porto together',
    startDate: '2027-06-01'
  });
  expect(detail.activity[0]).toMatchObject({ type: 'details_updated' });
});

test('skips no-op updates without adding activity', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  await owner.client.mutation(api.routes.trips.update.run, { input: updateInput, tripId });
  const before = await owner.client.run(async (ctx) => ({
    activity: await ctx.db
      .query('tripAuditEvents')
      .withIndex('by_tripId', (query) => query.eq('tripId', tripId))
      .take(30),
    trip: await ctx.db.get('trips', tripId)
  }));

  await owner.client.mutation(api.routes.trips.update.run, { input: updateInput, tripId });

  const after = await owner.client.run(async (ctx) => ({
    activity: await ctx.db
      .query('tripAuditEvents')
      .withIndex('by_tripId', (query) => query.eq('tripId', tripId))
      .take(30),
    trip: await ctx.db.get('trips', tripId)
  }));
  expect(after).toEqual(before);
});

test('keeps the trip summary and primary itinerary destination consistent', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });
  const second = tripLocationInput({
    latitude: 41.1579,
    longitude: -8.6291,
    name: 'Porto, Portugal',
    placeId: 'porto-place'
  });
  await owner.client.mutation(api.routes.trips.destinations.add.run, { input: second, tripId });

  await expect(
    owner.client.mutation(api.routes.trips.update.run, {
      input: { ...updateInput, destination: second },
      tripId
    })
  ).rejects.toThrow('That destination is already in this trip');
  await expect(
    owner.client.mutation(api.routes.trips.update.run, {
      input: { ...updateInput, destination: { status: 'undecided' } },
      tripId
    })
  ).rejects.toThrow('Remove itinerary destinations before marking the trip undecided');

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destination: { name: 'Lisbon, Portugal' },
    destinations: [{ name: 'Lisbon, Portugal' }, { name: 'Porto, Portugal' }],
    name: 'Summer beach idea'
  });
});

test('rejects archived updates without changing the trip', async () => {
  const { owner, tripId } = await setupTrip(0);
  await owner.client.mutation(api.routes.trips.archive.run, { tripId });

  await expect(
    owner.client.mutation(api.routes.trips.update.run, { input: updateInput, tripId })
  ).rejects.toThrow('Archived trips are read-only');
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    name: 'Summer beach idea'
  });
});

test('keeps the total trip timeline large enough for every destination day', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const durationInput = {
    currency: 'USD' as const,
    destination: { status: 'undecided' as const },
    duration: { totalDays: 5 },
    name: 'Summer beach idea'
  };
  await owner.client.mutation(api.routes.trips.update.run, { input: durationInput, tripId });

  await expect(
    owner.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput({ endDay: 6, startDay: 4 }),
      tripId
    })
  ).rejects.toThrow('must fit within the 5-day trip');
  await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 5, startDay: 4 }),
    tripId
  });

  await expect(
    owner.client.mutation(api.routes.trips.update.run, {
      input: { ...durationInput, duration: { totalDays: 4 } },
      tripId
    })
  ).rejects.toThrow('Trip length must include every destination, stay, activity, and travel day');
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    totalDurationDays: 5
  });
});

test('keeps the trip timeline large enough for exact travel timing', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const input = {
    currency: 'USD' as const,
    destination: { status: 'undecided' as const },
    duration: { totalDays: 5 },
    name: 'Summer beach idea'
  };
  await owner.client.mutation(api.routes.trips.update.run, { input, tripId });
  const firstId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });
  const secondId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ name: 'Porto', placeId: 'porto-timed-transfer' }),
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
    fromDestinationId: firstId,
    input: { mode: 'train', timing: { startDay: 5, startTime: '21:40' } },
    toDestinationId: secondId,
    tripId
  });

  await expect(
    owner.client.mutation(api.routes.trips.update.run, {
      input: { ...input, duration: { totalDays: 4 } },
      tripId
    })
  ).rejects.toThrow('travel day');
});

test('validates update details atomically', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  await expect(
    owner.client.mutation(api.routes.trips.update.run, {
      input: { ...updateInput, duration: { totalDays: 5 }, startDate: '2027-02-30' },
      tripId
    })
  ).rejects.toThrow('trip start date must be a valid date');
  await expect(
    owner.client.mutation(api.routes.trips.update.run, {
      input: { ...updateInput, duration: { idealDays: 2, minimumDays: 5 } },
      tripId
    })
  ).rejects.toThrow('ideal duration cannot be shorter');
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    idealDurationDays: null,
    minimumDurationDays: null,
    name: 'Summer beach idea'
  });
});
