import { expect, test } from 'vitest';
import { setupGroup, setupTrip } from '#testing/trips';

test('find returns null for foreign trips instead of throwing', { timeout: 15_000 }, async () => {
  const first = await setupTrip(0);
  const second = await setupGroup();

  await expect(
    first.owner.client.run(async (ctx) => {
      const { findTrip } = await import('#convex/modules/travel/trips/index');
      return await findTrip(ctx, first.tripId);
    })
  ).resolves.toMatchObject({ id: first.tripId });
  await expect(
    second.owner.client.run(async (ctx) => {
      const { findTrip } = await import('#convex/modules/travel/trips/index');
      return await findTrip(ctx, first.tripId);
    })
  ).resolves.toBeNull();
});

test('get rejects trips outside the viewer organization', { timeout: 15_000 }, async () => {
  const first = await setupTrip(0);
  const second = await setupGroup();

  await expect(
    second.owner.client.run(async (ctx) => {
      const { getTrip } = await import('#convex/modules/travel/trips/index');
      return await getTrip(ctx, first.tripId);
    })
  ).rejects.toThrow('Trip not found');
});
