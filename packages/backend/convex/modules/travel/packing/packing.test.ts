import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { openTripDraft, setupTrip, setupWritableTrip } from '#testing/trips';

test(
  'only the idea author can edit its isolated packing checklist',
  {
    timeout: 15_000
  },
  async () => {
    const { owner, users, tripId, sharedTripId } = await setupWritableTrip(1);
    const member = users[0];
    if (!member) throw new Error('Expected member');
    const outsider = await createOutsiderClient(owner.test);
    const passport = await owner.client.mutation(api.routes.trips.packing.add.run, {
      label: ' Passport ',
      tripId
    });
    expect(passport).toMatchObject({ label: 'Passport', quantity: 1 });
    await expect(
      owner.client.query(api.routes.trips.packing.list.run, { tripId: sharedTripId })
    ).resolves.toEqual([]);
    await expect(
      member.client.mutation(api.routes.trips.packing.update.run, {
        itemId: passport.id,
        quantity: 4,
        tripId
      })
    ).rejects.toThrow('Only the idea author');
    await expect(
      outsider.client.query(api.routes.trips.packing.list.run, { tripId })
    ).rejects.toThrow('Trip not found');
    await expect(
      outsider.client.mutation(api.routes.trips.packing.add.run, {
        label: 'Other item',
        tripId
      })
    ).rejects.toThrow('Trip not found');
    await owner.client.mutation(api.routes.trips.packing.update.run, {
      itemId: passport.id,
      quantity: 4,
      tripId
    });
    await expect(
      member.client.query(api.routes.trips.packing.list.run, { tripId })
    ).resolves.toEqual([
      { bringers: [], brought: 0, id: passport.id, label: 'Passport', quantity: 4 }
    ]);
    const other = await openTripDraft(member, sharedTripId);
    await expect(
      member.client.mutation(api.routes.trips.packing.remove.run, {
        itemId: passport.id,
        tripId: other.workingTripId
      })
    ).rejects.toThrow('Packing item not found');
  }
);

test('public and assistant packing writes cannot bypass ideas', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupTrip(0);
  const idea = await openTripDraft(owner, tripId);
  const item = await owner.client.mutation(api.routes.trips.packing.add.run, {
    label: 'Passport',
    tripId: idea.workingTripId
  });
  for (const [add, update, remove] of [
    [
      api.routes.trips.packing.add.run,
      api.routes.trips.packing.update.run,
      api.routes.trips.packing.remove.run
    ],
    [
      internal.modules.travel.packing.writes.add,
      internal.modules.travel.packing.writes.update,
      internal.modules.travel.packing.writes.remove
    ]
  ] as const) {
    await expect(owner.client.mutation(add, { label: 'Hat', tripId })).rejects.toThrow(
      'Start an idea'
    );
    await expect(
      owner.client.mutation(update, { itemId: item.id, quantity: 2, tripId })
    ).rejects.toThrow('Start an idea');
    await expect(owner.client.mutation(remove, { itemId: item.id, tripId })).rejects.toThrow(
      'Start an idea'
    );
  }
});

test('rejects packing writes on archived trips', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  await owner.client.mutation(api.routes.trips.archive.run, { tripId });
  await expect(
    owner.client.mutation(api.routes.trips.packing.add.run, { label: 'Passport', tripId })
  ).rejects.toThrow('Archived trips are read-only');
});

test(
  'appends packing items after the highest remaining sort order',
  {
    timeout: 15_000
  },
  async () => {
    const { owner, tripId } = await setupWritableTrip(0);
    const first = await owner.client.mutation(api.routes.trips.packing.add.run, {
      label: 'Passport',
      tripId
    });
    const second = await owner.client.mutation(api.routes.trips.packing.add.run, {
      label: 'Sunscreen',
      tripId
    });
    const third = await owner.client.mutation(api.routes.trips.packing.add.run, {
      label: 'Hat',
      tripId
    });
    const fourth = await owner.client.mutation(api.routes.trips.packing.add.run, {
      label: 'Jacket',
      tripId
    });
    await owner.client.mutation(api.routes.trips.packing.remove.run, {
      itemId: first.id,
      tripId
    });
    await owner.client.mutation(api.routes.trips.packing.remove.run, {
      itemId: second.id,
      tripId
    });
    const fifth = await owner.client.mutation(api.routes.trips.packing.add.run, {
      label: 'Charger',
      tripId
    });
    await expect(
      owner.client.query(api.routes.trips.packing.list.run, { tripId })
    ).resolves.toEqual([
      { bringers: [], brought: 0, id: third.id, label: 'Hat', quantity: 1 },
      { bringers: [], brought: 0, id: fourth.id, label: 'Jacket', quantity: 1 },
      { bringers: [], brought: 0, id: fifth.id, label: 'Charger', quantity: 1 }
    ]);
  }
);

test('rejects empty packing labels', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  await expect(
    owner.client.mutation(api.routes.trips.packing.add.run, { label: '   ', tripId })
  ).rejects.toThrow('Packing items need a name');
});

test('adds, updates, and validates item quantities', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const tent = await owner.client.mutation(api.routes.trips.packing.add.run, {
    label: 'Tent',
    quantity: 3,
    tripId
  });
  expect(tent).toMatchObject({ label: 'Tent', quantity: 3 });
  await expect(
    owner.client.mutation(api.routes.trips.packing.update.run, {
      itemId: tent.id,
      quantity: 5,
      tripId
    })
  ).resolves.toMatchObject({ label: 'Tent', quantity: 5 });
  for (const quantity of [0, 100, 1.5]) {
    await expect(
      owner.client.mutation(api.routes.trips.packing.add.run, { label: 'Hat', quantity, tripId })
    ).rejects.toThrow('Quantity must be a whole number');
  }
  await expect(
    owner.client.mutation(api.routes.trips.packing.update.run, { itemId: tent.id, tripId })
  ).rejects.toThrow('Provide a quantity or a new name');
  await owner.client.mutation(api.routes.trips.packing.remove.run, { itemId: tent.id, tripId });
  await expect(owner.client.query(api.routes.trips.packing.list.run, { tripId })).resolves.toEqual(
    []
  );
});
