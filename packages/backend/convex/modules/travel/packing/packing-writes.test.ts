import { expect, test } from 'vite-plus/test';
import { internal } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupWritableTrip } from '#testing/trips';

const writes = internal.modules.travel.packing.writes;

test(
  'assistant packing writes add, update, list, and remove items',
  { timeout: 30_000 },
  async () => {
    const { owner, tripId, sharedTripId } = await setupWritableTrip(0);
    const item = await owner.client.mutation(writes.add, { label: 'Passport', tripId });
    expect(item).toMatchObject({ label: 'Passport', quantity: 1 });
    await expect(
      owner.client.mutation(writes.update, { itemId: item.id, quantity: 2, tripId })
    ).resolves.toMatchObject({ label: 'Passport', quantity: 2 });
    await expect(owner.client.query(writes.list, { tripId })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: item.id, quantity: 2 })])
    );
    await owner.client.mutation(writes.remove, { itemId: item.id, tripId });
    expect(
      (await owner.client.query(writes.list, { tripId })).some((row) => row.id === item.id)
    ).toBe(false);

    // The shared trip is read-only outside an idea; strangers cannot see it at all.
    await expect(
      owner.client.mutation(writes.add, { label: 'Hat', tripId: sharedTripId })
    ).rejects.toThrow();
    const outsider = await createOutsiderClient(owner.test);
    await expect(outsider.client.query(writes.list, { tripId })).rejects.toThrow('Trip not found');
  }
);
