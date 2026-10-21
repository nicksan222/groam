import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { confirmFixtureSeats, markTripBillable, setupBillableTrip } from '#testing/payments';
import { tripInput } from '#testing/trips';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test('100-member private-trip poll feeds stay within the index-range budget and retain every cursor row', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_budget');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_budget');
  const { owner, users } = await setupBillableTrip(99);
  const pollIds: string[] = [];
  let now = Date.now();
  const clock = vi.spyOn(Date, 'now');
  for (let index = 0; index < 21; index += 1) {
    now += 7 * 60_000;
    clock.mockReturnValue(now);
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- fixture order defines cursor order
    const tripId = await owner.client.action(api.routes.trips.create.run, { input: tripInput() });
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- each trip is explicitly billable before adding its poll
    await markTripBillable(owner, tripId);
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- confirmed seats exercise both payment and private-audience fanout
    await confirmFixtureSeats(
      owner,
      tripId,
      users.map(({ userId }) => userId)
    );
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- each private chat belongs to a distinct trip
    const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
      clientRequestId: crypto.randomUUID(),
      memberUserIds: users.slice(0, 24).map(({ userId }) => userId),
      title: `Private chat ${index}`,
      tripId
    });
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- persist ordered public polls for cursor assertions
    const pollId = await owner.client.mutation(api.routes.polls.create.run, {
      discussionId,
      multiSelect: false,
      options: ['A', 'B'],
      question: `Question ${index}`
    });
    pollIds.unshift(pollId);
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- actual votes verify tally semantics survive the optimization
    await users[0]!.client.mutation(api.routes.polls.vote.run, { pollId, optionIds: ['o1'] });
  }
  const readPage = (cursor: string | null) =>
    owner.client.run(async (ctx) => {
      const result = await ctx.runQuery(
        api.routes.polls.list.open.page.run,
        {
          paginationOpts: { numItems: 50, cursor }
        },
        { transactionLimits: { databaseQueries: 4096 } }
      );
      return { result, metrics: await ctx.meta.getTransactionMetrics() };
    });
  const first = await readPage(null);
  expect(first.result.page).toHaveLength(10);
  expect(first.result.isDone).toBe(false);
  const second = await readPage(first.result.continueCursor);
  const third = await readPage(second.result.continueCursor);
  expect(third.result.isDone).toBe(true);
  expect([first, second, third].flatMap(({ result }) => result.page.map(({ id }) => id))).toEqual(
    pollIds
  );
  for (const page of [first, second, third]) {
    expect(page.metrics.databaseQueries.used).toBeLessThan(4096);
    expect(page.result.page.every(({ votedCount }) => votedCount === 1)).toBe(true);
  }
  const legacy = await owner.client.run(async (ctx) => {
    const result = await ctx.runQuery(
      api.routes.polls.list.open.run,
      {},
      {
        transactionLimits: { databaseQueries: 4096 }
      }
    );
    return { result, metrics: await ctx.meta.getTransactionMetrics() };
  });
  expect(legacy.result.map(({ id }) => id)).toEqual(pollIds.slice(0, 10));
  expect(legacy.metrics.databaseQueries.used).toBeLessThan(4096);
  const nonAudience = await users[98]!.client.run((ctx) =>
    ctx.runQuery(
      api.routes.polls.list.open.page.run,
      { paginationOpts: { numItems: 50, cursor: null } },
      { transactionLimits: { databaseQueries: 4096 } }
    )
  );
  expect(nonAudience.page).toEqual([]);
  expect(nonAudience.isDone).toBe(false);
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  const skipped = await readPage(null);
  expect(skipped.result.page.map(({ id }) => id)).toEqual(pollIds.slice(0, 10));
  expect(skipped.result.page.every(({ votedCount }) => votedCount === 1)).toBe(true);
});
