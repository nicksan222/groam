import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { openTripDraft, setupWritableTrip } from '#testing/trips';

test('sets, updates, and removes what a traveler brings', { timeout: 15_000 }, async () => {
  const { owner, tripId, users } = await setupWritableTrip(1);
  const friend = users[0];
  if (!friend) throw new Error('Expected a traveler');
  const tent = await owner.client.mutation(api.routes.trips.packing.add.run, {
    label: 'Tent',
    quantity: 2,
    tripId
  });
  await owner.client.mutation(api.routes.trips.packing.bring.run, {
    count: 1,
    itemId: tent.id,
    tripId,
    userId: owner.userId
  });
  await owner.client.mutation(api.routes.trips.packing.bring.run, {
    count: 3,
    itemId: tent.id,
    tripId,
    userId: friend.userId
  });
  const [listed] = await owner.client.query(api.routes.trips.packing.list.run, { tripId });
  // Over-coverage is allowed: 4 brought for 2 needed.
  expect(listed).toMatchObject({ brought: 4, label: 'Tent', quantity: 2 });
  expect(listed?.bringers).toHaveLength(2);
  expect(listed?.bringers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ count: 1, userId: owner.userId }),
      expect.objectContaining({ count: 3, userId: friend.userId })
    ])
  );
  expect(listed?.bringers.every((row) => row.name.length > 0)).toBe(true);

  await owner.client.mutation(api.routes.trips.packing.bring.run, {
    count: 2,
    itemId: tent.id,
    tripId,
    userId: friend.userId
  });
  await expect(
    owner.client.query(api.routes.trips.packing.list.run, { tripId })
  ).resolves.toMatchObject([{ brought: 3 }]);

  await owner.client.mutation(api.routes.trips.packing.bring.run, {
    count: 0,
    itemId: tent.id,
    tripId,
    userId: friend.userId
  });
  const [after] = await owner.client.query(api.routes.trips.packing.list.run, { tripId });
  expect(after?.bringers.map((row) => row.userId)).toEqual([owner.userId]);
  // Removing someone who is not bringing is a no-op.
  await owner.client.mutation(api.routes.trips.packing.bring.run, {
    count: 0,
    itemId: tent.id,
    tripId,
    userId: friend.userId
  });
});

test('rejects travelers outside the trip and bad counts', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const tent = await owner.client.mutation(api.routes.trips.packing.add.run, {
    label: 'Tent',
    tripId
  });
  await expect(
    owner.client.mutation(api.routes.trips.packing.bring.run, {
      count: 1,
      itemId: tent.id,
      tripId,
      userId: 'someone-else'
    })
  ).rejects.toThrow('Traveler not found');
  for (const count of [-1, 100, 1.5]) {
    await expect(
      owner.client.mutation(api.routes.trips.packing.bring.run, {
        count,
        itemId: tent.id,
        tripId,
        userId: owner.userId
      })
    ).rejects.toThrow('Count must be a whole number');
  }
});

test('removing an item clears its bringers', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const tent = await owner.client.mutation(api.routes.trips.packing.add.run, {
    label: 'Tent',
    tripId
  });
  await owner.client.mutation(api.routes.trips.packing.bring.run, {
    count: 1,
    itemId: tent.id,
    tripId,
    userId: owner.userId
  });
  await owner.client.mutation(api.routes.trips.packing.remove.run, { itemId: tent.id, tripId });
  const leftovers = await owner.test.run((ctx) =>
    ctx.db
      .query('tripPackingBringers')
      .withIndex('by_tripId', (query) => query.eq('tripId', tripId))
      .take(10)
  );
  expect(leftovers).toEqual([]);
});

test('bringing is an idea write, not a shared-trip write', { timeout: 15_000 }, async () => {
  const { owner, tripId, sharedTripId } = await setupWritableTrip(0);
  const tent = await owner.client.mutation(api.routes.trips.packing.add.run, {
    label: 'Tent',
    tripId
  });
  await expect(
    owner.client.mutation(api.routes.trips.packing.bring.run, {
      count: 1,
      itemId: tent.id,
      tripId: sharedTripId,
      userId: owner.userId
    })
  ).rejects.toThrow('Start an idea');
});

test('deleting a trip clears bringers and personal items', { timeout: 30_000 }, async () => {
  const { owner, tripId, sharedTripId } = await setupWritableTrip(0);
  const tent = await owner.client.mutation(api.routes.trips.packing.add.run, {
    label: 'Tent',
    tripId
  });
  await owner.client.mutation(api.routes.trips.packing.bring.run, {
    count: 1,
    itemId: tent.id,
    tripId,
    userId: owner.userId
  });
  await owner.client.mutation(api.routes.trips.packing.personal.add.run, {
    label: 'Socks',
    tripId
  });
  const { TripPacking } = await import('#convex/modules/travel/packing/index');
  for (const id of [tripId, sharedTripId]) {
    await owner.test.run(async (ctx) => {
      while (await TripPacking.deleteForTrip(ctx, id, 50)) {
        // Batches repeat until nothing is left.
      }
    });
  }
  const counts = await owner.test.run(async (ctx) => {
    const targetTripIds = [tripId, sharedTripId];
    const [items, bringers, personalItems] = await Promise.all([
      Promise.all(
        targetTripIds.map((targetTripId) =>
          ctx.db
            .query('tripPackingItems')
            .withIndex('by_tripId_and_sortOrder', (query) => query.eq('tripId', targetTripId))
            .take(10)
        )
      ),
      Promise.all(
        targetTripIds.map((targetTripId) =>
          ctx.db
            .query('tripPackingBringers')
            .withIndex('by_tripId', (query) => query.eq('tripId', targetTripId))
            .take(10)
        )
      ),
      Promise.all(
        targetTripIds.map((targetTripId) =>
          ctx.db
            .query('tripPersonalPackingItems')
            .withIndex('by_tripId_and_userId_and_sortOrder', (query) =>
              query.eq('tripId', targetTripId)
            )
            .take(10)
        )
      )
    ]);
    return [items.flat().length, bringers.flat().length, personalItems.flat().length];
  });
  expect(counts).toEqual([0, 0, 0]);
});

test(
  'bring rejects users from another group and items from another trip',
  {
    timeout: 30_000
  },
  async () => {
    const { owner, tripId, sharedTripId, version } = await setupWritableTrip(0);
    const tent = await owner.client.mutation(api.routes.trips.packing.add.run, {
      label: 'Tent',
      tripId
    });
    const outsider = await createOutsiderClient(owner.test);
    await expect(
      owner.client.mutation(api.routes.trips.packing.bring.run, {
        count: 1,
        itemId: tent.id,
        tripId,
        userId: outsider.userId
      })
    ).rejects.toThrow('Traveler not found on this trip');

    const other = await openTripDraft(owner, sharedTripId);
    expect(other.workingTripId).not.toBe(version.workingTripId);
    await expect(
      owner.client.mutation(api.routes.trips.packing.bring.run, {
        count: 1,
        itemId: tent.id,
        tripId: other.workingTripId,
        userId: owner.userId
      })
    ).rejects.toThrow('Packing item not found');
  }
);
