import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { pngBlob, seedDenseMediaOrigins } from '#testing/media';
import { confirmFixtureSeats, setupBillableTrip } from '#testing/payments';
import { openTripDraft } from '#testing/trips';

afterEach(() => vi.unstubAllEnvs());

test('dense media origin windows stay bounded and preserve all cursor rows', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_media_budget');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_media_budget');
  const { owner, users, tripId } = await setupBillableTrip(1);
  const member = users[0]!;
  const storageId = await owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  const older = await owner.client.action(api.routes.media.save.run, {
    storageId,
    contentType: 'image/png',
    name: 'Older ordinary upload'
  });
  if (!older.ok) throw new Error(older.error);
  const draft = await openTripDraft(owner, tripId);
  const dense = await seedDenseMediaOrigins(owner, draft.workingTripId, 26);
  const page = (cursor: string | null) =>
    member.client.run(async (ctx) => {
      const result = await ctx.runQuery(
        api.routes.media.page.run,
        { paginationOpts: { numItems: 50, cursor } },
        { transactionLimits: { databaseQueries: 4096 } }
      );
      return { result, metrics: await ctx.meta.getTransactionMetrics() };
    });
  const first = await page(null);
  expect(first.result.page).toEqual([]);
  expect(first.result.isDone).toBe(false);
  expect(first.metrics.databaseQueries.used).toBeLessThan(3400);
  const next = await page(first.result.continueCursor);
  expect(next.result.isDone).toBe(true);
  expect(next.result.page).toEqual([
    expect.objectContaining({ id: older.mediaId, url: expect.any(String) })
  ]);
  const compatibility = await member.client.run((ctx) =>
    ctx.runQuery(
      api.routes.media.list.run,
      { limit: 50 },
      { transactionLimits: { databaseQueries: 4096 } }
    )
  );
  expect(compatibility).toEqual([]);
  await confirmFixtureSeats(owner, tripId, [member.userId]);
  const paidFirst = await page(null);
  const paidNext = await page(paidFirst.result.continueCursor);
  expect(paidFirst.result.page).toHaveLength(20);
  expect([...paidFirst.result.page, ...paidNext.result.page].map(({ id }) => id)).toEqual([
    ...dense,
    older.mediaId
  ]);
  expect(paidFirst.result.page.every(({ url }) => typeof url === 'string')).toBe(true);
  expect(paidFirst.metrics.databaseQueries.used).toBeLessThan(3400);
});
