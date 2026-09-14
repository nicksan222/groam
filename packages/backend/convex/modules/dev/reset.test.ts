import { expect, test } from 'vitest';
import { clearApplicationTables } from '#convex/modules/dev/reset';
import { setupTrip } from '#testing/trips';

test('clears application documents without touching the helper itself', async () => {
  const { owner, tripId } = await setupTrip(0);

  const cleared = await owner.client.run(async (ctx) => {
    expect(await ctx.db.get('trips', tripId)).not.toBeNull();
    return await clearApplicationTables(ctx);
  });

  expect(cleared).toBeGreaterThan(0);
  await owner.client.run(async (ctx) => {
    expect(await ctx.db.query('trips').first()).toBeNull();
    expect(await ctx.db.query('tripDestinations').first()).toBeNull();
  });
});
