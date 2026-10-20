import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createTripPoll } from '#testing/polls';
import { setupTrip } from '#testing/trips';

afterEach(() => vi.unstubAllEnvs());

function enablePayments() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_seats');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_seats');
}

test('unpaid members can preview and decline but cannot propose, chat, or vote by direct API', async () => {
  enablePayments();
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0]!;
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [member.userId],
    title: 'Trip chat',
    tripId
  });
  const pollId = await createTripPoll(owner, tripId);
  expect(await member.client.query(api.routes.trips.get.run, { tripId })).toMatchObject({
    id: tripId
  });
  expect(await member.client.query(api.routes.trips.find.run, { tripId })).toMatchObject({
    id: tripId
  });
  expect(
    (await member.client.query(api.routes.trips.payments.status.run, { tripId })).enabled
  ).toBe(true);
  expect(await member.client.query(api.routes.trips.travelers.list.run, { tripId })).toHaveLength(
    2
  );
  expect(await owner.client.query(api.routes.polls.get.run, { pollId })).toMatchObject({
    eligibleCount: 1
  });
  await member.client.mutation(api.routes.trips.travelers.set.run, { tripId, status: 'not_going' });
  await expect(
    member.client.mutation(api.routes.trips.versions.create.run, { tripId })
  ).rejects.toThrow('Trip not found');
  await expect(
    member.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: crypto.randomUUID(),
      discussionId,
      text: 'Bypass attempt'
    })
  ).rejects.toThrow('Discussion not found');
  await expect(
    member.client.mutation(api.routes.discussions.create.run, {
      clientRequestId: crypto.randomUUID(),
      memberUserIds: [],
      title: 'New chat bypass',
      tripId
    })
  ).rejects.toThrow('Trip not found');
  await expect(
    member.client.mutation(api.routes.polls.vote.run, { pollId, optionIds: ['o1'] })
  ).rejects.toThrow('Poll not found');
  expect(await owner.client.query(api.routes.polls.get.run, { pollId })).toMatchObject({
    eligibleCount: 1
  });
});

test('paid seats unlock participation and idea drafts inherit the shared trip entitlement', async () => {
  enablePayments();
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0]!;
  const paymentId = await owner.test.run(
    async (ctx) =>
      await ctx.db.insert('tripPayments', {
        attempt: 'verified-fixture',
        expiresAt: 1,
        paid: true,
        payerId: member.userId,
        tripId,
        userId: member.userId
      })
  );
  await member.client.mutation(api.routes.trips.travelers.set.run, { tripId, status: 'going' });
  const idea = await member.client.mutation(api.routes.trips.versions.create.run, { tripId });
  const pollId = await createTripPoll(owner, tripId);
  await member.client.mutation(api.routes.polls.vote.run, { pollId, optionIds: ['o1'] });
  await owner.test.run(
    async (ctx) => await ctx.db.patch('tripPayments', paymentId, { paid: false })
  );
  await expect(
    member.client.mutation(api.routes.trips.versions.create.run, { tripId: idea.workingTripId })
  ).rejects.toThrow('Trip not found');
});

test('disabling Stripe preserves participation on billable trips', async () => {
  enablePayments();
  const { tripId, users } = await setupTrip(1);
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  await expect(
    users[0]!.client.mutation(api.routes.trips.versions.create.run, { tripId })
  ).resolves.toHaveProperty('proposalId');
});
