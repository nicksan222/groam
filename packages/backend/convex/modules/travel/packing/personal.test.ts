import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip, setupWritableTrip, tripInput } from '#testing/trips';

test('personal lists are private to their owner', { timeout: 30_000 }, async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const friend = users[0];
  if (!friend) throw new Error('Expected a traveler');
  const socks = await owner.client.mutation(api.routes.trips.packing.personal.add.run, {
    label: ' Socks ',
    tripId
  });
  expect(socks).toEqual({ id: socks.id, label: 'Socks', packed: false });
  await expect(
    owner.client.mutation(api.routes.trips.packing.personal.update.run, {
      itemId: socks.id,
      packed: true,
      tripId
    })
  ).resolves.toMatchObject({ packed: true });
  await expect(
    owner.client.query(api.routes.trips.packing.personal.list.run, { tripId })
  ).resolves.toEqual([{ id: socks.id, label: 'Socks', packed: true }]);

  // Another traveler sees an empty list and cannot touch the owner's rows.
  await expect(
    friend.client.query(api.routes.trips.packing.personal.list.run, { tripId })
  ).resolves.toEqual([]);
  await expect(
    friend.client.mutation(api.routes.trips.packing.personal.update.run, {
      itemId: socks.id,
      packed: false,
      tripId
    })
  ).rejects.toThrow('Packing item not found');
  await expect(
    friend.client.mutation(api.routes.trips.packing.personal.remove.run, {
      itemId: socks.id,
      tripId
    })
  ).rejects.toThrow('Packing item not found');
  const outsider = await createOutsiderClient(owner.test);
  await expect(
    outsider.client.query(api.routes.trips.packing.personal.list.run, { tripId })
  ).rejects.toThrow('Trip not found');

  const own = await friend.client.mutation(api.routes.trips.packing.personal.add.run, {
    label: 'Charger',
    tripId
  });
  await expect(
    friend.client.query(api.routes.trips.packing.personal.list.run, { tripId })
  ).resolves.toEqual([{ id: own.id, label: 'Charger', packed: false }]);
  await friend.client.mutation(api.routes.trips.packing.personal.remove.run, {
    itemId: own.id,
    tripId
  });
  await expect(
    friend.client.query(api.routes.trips.packing.personal.list.run, { tripId })
  ).resolves.toEqual([]);
});

test('an idea working copy id resolves to the shared trip', { timeout: 15_000 }, async () => {
  const { owner, tripId, sharedTripId } = await setupWritableTrip(0);
  const item = await owner.client.mutation(api.routes.trips.packing.personal.add.run, {
    label: 'Passport',
    tripId
  });
  await expect(
    owner.client.query(api.routes.trips.packing.personal.list.run, { tripId: sharedTripId })
  ).resolves.toEqual([item]);
  const rows = await owner.test.run((ctx) => ctx.db.query('tripPersonalPackingItems').collect());
  expect(rows.map((row) => row.tripId)).toEqual([sharedTripId]);
});

test('personal lists reject writes on archived trips and validate names', async () => {
  const { owner, tripId } = await setupTrip(0);
  await expect(
    owner.client.mutation(api.routes.trips.packing.personal.add.run, { label: '  ', tripId })
  ).rejects.toThrow('Packing items need a name');
  const item = await owner.client.mutation(api.routes.trips.packing.personal.add.run, {
    label: 'Hat',
    tripId
  });
  await owner.client.mutation(api.routes.trips.archive.run, { tripId });
  await expect(
    owner.client.mutation(api.routes.trips.packing.personal.add.run, { label: 'Scarf', tripId })
  ).rejects.toThrow('Archived trips are read-only');
  await expect(
    owner.client.mutation(api.routes.trips.packing.personal.update.run, {
      itemId: item.id,
      packed: true,
      tripId
    })
  ).rejects.toThrow('Archived trips are read-only');
  await expect(
    owner.client.query(api.routes.trips.packing.personal.list.run, { tripId })
  ).resolves.toEqual([item]);
});

test('a personal item cannot be updated through another trip', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupTrip(0);
  const otherTripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput()
  });
  const item = await owner.client.mutation(api.routes.trips.packing.personal.add.run, {
    label: 'Hat',
    tripId
  });
  await expect(
    owner.client.mutation(api.routes.trips.packing.personal.update.run, {
      itemId: item.id,
      packed: true,
      tripId: otherTripId
    })
  ).rejects.toThrow('Packing item not found');
});
