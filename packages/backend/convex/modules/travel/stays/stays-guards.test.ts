import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { setupWritableTrip, tripLocationInput } from '#testing/trips';

const stays = api.routes.trips.destinations.stays;
const stay = (overrides: Record<string, unknown> = {}) => ({
  schedule: { checkInDay: 1, checkOutDay: 2 },
  title: 'Hotel Tejo',
  ...overrides
});

async function setup() {
  const trip = await setupWritableTrip(0);
  const { owner, tripId } = trip;
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, startDay: 1 }),
    tripId
  });
  return { ...trip, destinationId };
}

test('stays validate their days, text, and destination', { timeout: 30_000 }, async () => {
  const { destinationId, owner, tripId, sharedTripId } = await setup();
  const add = (input: ReturnType<typeof stay>) =>
    owner.client.mutation(stays.add.run, { destinationId, input: input as never, tripId });

  await expect(add(stay({ schedule: { checkInDay: 2, checkOutDay: 1 } }))).rejects.toThrow(
    'valid chronological range'
  );
  await expect(add(stay({ schedule: { checkInDay: 1, checkOutDay: 5 } }))).rejects.toThrow(
    'within the destination day range'
  );
  await expect(add(stay({ title: '   ' }))).rejects.toThrow('stay name must be between');
  await expect(add(stay({ notes: 'n'.repeat(10_001) }))).rejects.toThrow('stay notes must be');
  await expect(
    owner.client.mutation(stays.add.run, {
      destinationId,
      input: stay(),
      tripId: sharedTripId
    })
  ).rejects.toThrow();

  const stayId = await add(stay({ address: '  1 River Road  ', notes: '  ' }));
  // An unchanged update is a no-op; a changed one is saved.
  await owner.client.mutation(stays.update.run, {
    input: stay({ address: '1 River Road' }),
    stayId,
    tripId
  });
  await owner.client.mutation(stays.update.run, {
    input: stay({ title: 'Hotel Douro' }),
    stayId,
    tripId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: expect.arrayContaining([
      expect.objectContaining({ stays: [expect.objectContaining({ title: 'Hotel Douro' })] })
    ])
  });
  await expect(
    owner.client.mutation(stays.update.run, { input: stay(), stayId, tripId: sharedTripId })
  ).rejects.toThrow();
});

test('moving and removing a destination carries its stays', { timeout: 30_000 }, async () => {
  const { destinationId, owner, tripId } = await setup();
  await owner.client.mutation(stays.add.run, {
    destinationId,
    input: stay({ schedule: { checkInDay: 2, checkOutDay: 3 } }),
    tripId
  });
  const laterId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 5, name: 'Porto', placeId: 'porto', startDay: 4 }),
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.move.run, {
    destinationId: laterId,
    direction: 'earlier',
    tripId
  });
  const moved = await owner.client.query(api.routes.trips.get.run, { tripId });
  const destination = moved.destinations.find((item) => item.id === destinationId);
  expect(destination?.stays).toEqual([expect.objectContaining({ checkInDay: 4, checkOutDay: 5 })]);

  await owner.client.mutation(api.routes.trips.destinations.remove.run, { destinationId, tripId });
  const after = await owner.client.query(api.routes.trips.get.run, { tripId });
  expect(after.destinations.some((item) => item.id === destinationId)).toBe(false);
  await expect(
    owner.client.run(async (ctx) =>
      ctx.db
        .query('tripDestinationStays')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
        .collect()
    )
  ).resolves.toEqual([]);
});
