import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import {
  confirmFixtureSeats,
  seedPrivateTripPollHistory,
  setupBillableTrip
} from '#testing/payments';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function fixture(memberCount: number, pollCount = 21) {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_budget');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_budget');
  const { owner, users, tripId } = await setupBillableTrip(memberCount - 1);
  await confirmFixtureSeats(
    owner,
    tripId,
    users.map(({ userId }) => userId)
  );
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: users.slice(0, Math.min(24, memberCount - 2)).map(({ userId }) => userId),
    title: 'Private trip poll seed',
    tripId
  });
  const seedPollId = await owner.client.mutation(api.routes.polls.create.run, {
    discussionId,
    multiSelect: false,
    options: ['A', 'B'],
    question: 'Seed question'
  });
  await users[0]!.client.mutation(api.routes.polls.vote.run, {
    pollId: seedPollId,
    optionIds: ['o1']
  });
  const pollIds = await seedPrivateTripPollHistory(owner, seedPollId, pollCount - 1, memberCount);
  const readPage = (cursor: string | null) =>
    owner.client.run(async (ctx) => {
      const result = await ctx.runQuery(
        api.routes.polls.list.open.page.run,
        { paginationOpts: { numItems: 50, cursor } },
        { transactionLimits: { databaseQueries: 4096 } }
      );
      return { result, metrics: await ctx.meta.getTransactionMetrics() };
    });
  return { owner, users, pollIds, readPage };
}

test('100-member private-trip poll feeds keep both read paths within the index-range budget', async () => {
  const { owner, pollIds, readPage } = await fixture(100, 11);
  const first = await readPage(null);
  expect(first.result.page.map(({ id }) => id)).toEqual(pollIds.slice(0, 10));
  expect(first.result.isDone).toBe(false);
  expect(first.result.continueCursor).toBeTruthy();
  expect(first.result.page.every(({ votedCount }) => votedCount === 1)).toBe(true);
  expect(first.metrics.databaseQueries.used).toBeLessThan(4096);
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
  expect(legacy.result.every(({ votedCount }) => votedCount === 1)).toBe(true);
  expect(legacy.metrics.databaseQueries.used).toBeLessThan(4096);
});

test('poll cursors preserve every row, disabled payments, and private audiences', async () => {
  const { users, pollIds, readPage } = await fixture(3);
  const first = await readPage(null);
  const second = await readPage(first.result.continueCursor);
  const third = await readPage(second.result.continueCursor);
  expect([first.result.page.length, second.result.page.length, third.result.page.length]).toEqual([
    10, 10, 1
  ]);
  expect(first.result.isDone).toBe(false);
  expect(second.result.isDone).toBe(false);
  expect(third.result.isDone).toBe(true);
  expect([first, second, third].flatMap(({ result }) => result.page.map(({ id }) => id))).toEqual(
    pollIds
  );
  expect(
    [first, second, third].every(({ result }) =>
      result.page.every(({ votedCount }) => votedCount === 1)
    )
  ).toBe(true);
  const nonAudience = await users[1]!.client.query(api.routes.polls.list.open.page.run, {
    paginationOpts: { numItems: 50, cursor: null }
  });
  expect(nonAudience.page).toEqual([]);
  expect(nonAudience.isDone).toBe(false);
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  const skipped = await readPage(null);
  expect(skipped.result.page.map(({ id }) => id)).toEqual(pollIds.slice(0, 10));
  expect(skipped.result.page.every(({ votedCount }) => votedCount === 1)).toBe(true);
  expect(
    (
      await users[1]!.client.query(api.routes.polls.list.open.page.run, {
        paginationOpts: { numItems: 50, cursor: null }
      })
    ).page
  ).toEqual([]);
});
