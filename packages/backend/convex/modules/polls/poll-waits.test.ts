import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { agentWorkflow } from '#convex/modules/assistant/engine/manager';
import { createTripPoll, pollWaitRun } from '#testing/polls';
import { setupTrip, tripInput } from '#testing/trips';

// oxlint-disable-next-line jest/no-export -- convex-test discovers test-only functions through module exports.
export const idle = agentWorkflow.define({ args: {} }).handler(async (step): Promise<void> => {
  // `pollWaitRun` runs park here so wait events have a live workflow to target.
  await step.awaitEvent({ name: 'never' });
});

test('a vote that meets the rule resolves only that poll’s wait', async () => {
  const trip = await setupTrip(1);
  const [member] = trip.users;
  if (!member) throw new Error('Expected a member');
  const watched = await createTripPoll(trip.owner, trip.tripId);
  const other = await createTripPoll(trip.owner, trip.tripId, { question: 'Other?' });
  const a = await pollWaitRun(trip, watched, [{ kind: 'allVoted' }]);
  const b = await pollWaitRun(trip, other, [{ kind: 'allVoted' }]);
  await trip.owner.client.mutation(api.routes.polls.vote.run, {
    optionIds: ['o1'],
    pollId: watched
  });
  expect((await a.wait())?.status).toBe('waiting');
  await member.client.mutation(api.routes.polls.vote.run, { optionIds: ['o2'], pollId: watched });
  expect(await a.wait()).toMatchObject({
    outcome: {
      progress: '2 of 2 voted',
      reason: 'met',
      summary: "everyone voted for 'Where should we eat?' — Sushi 1, Tapas 1; 2 of 2 voted"
    },
    status: 'met'
  });
  expect((await b.wait())?.status).toBe('waiting');
});

test('a retracted vote un-meets a quorum that was not yet resolved', async () => {
  const trip = await setupTrip(2);
  const [first] = trip.users;
  if (!first) throw new Error('Expected members');
  const pollId = await createTripPoll(trip.owner, trip.tripId);
  const run = await pollWaitRun(trip, pollId, [{ count: 3, kind: 'quorum' }]);
  await trip.owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  await first.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  await first.client.mutation(api.routes.polls.retract.run, { pollId });
  expect(await run.wait()).toMatchObject({ status: 'waiting' });
});

test('two votes that both meet the rule resolve the wait once', async () => {
  const trip = await setupTrip(2);
  const [first, second] = trip.users;
  if (!first || !second) throw new Error('Expected members');
  const pollId = await createTripPoll(trip.owner, trip.tripId);
  const run = await pollWaitRun(trip, pollId, [{ count: 1, kind: 'quorum' }]);
  await Promise.all([
    first.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId }),
    second.client.mutation(api.routes.polls.vote.run, { optionIds: ['o2'], pollId })
  ]);
  const wait = await run.wait();
  expect(wait?.status).toBe('met');
  const resolvedAt = wait?.resolvedAt;
  const outcome = wait?.outcome;
  await trip.owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o2'], pollId });
  expect(await run.wait()).toMatchObject({ outcome, resolvedAt, status: 'met' });
  const waits = await trip.owner.test.run(
    async (ctx) =>
      (
        await ctx.db
          .query('agentWaits')
          .withIndex('by_runId', (query) => query.eq('runId', run.runId))
          .take(10)
      ).length
  );
  expect(waits).toBe(1);
});

test('invited travelers without an account are neither eligible nor counted', async () => {
  const trip = await setupTrip(1);
  const [member] = trip.users;
  if (!member) throw new Error('Expected a member');
  await trip.owner.test.run((ctx) =>
    ctx.db.insert('tripTravelers', {
      email: 'friend@example.com',
      name: 'Friend',
      organizationId: trip.owner.organizationId as string,
      status: 'invited',
      tripId: trip.tripId,
      updatedAt: Date.now()
    })
  );
  const pollId = await createTripPoll(trip.owner, trip.tripId);
  const run = await pollWaitRun(trip, pollId, [{ kind: 'allVoted' }]);
  await expect(
    trip.owner.client.query(api.routes.polls.get.run, { pollId })
  ).resolves.toMatchObject({ eligibleCount: 2 });
  await trip.owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  await member.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  expect((await run.wait())?.status).toBe('met');
});

test('a deadline after the rule was met is a no-op', async () => {
  const trip = await setupTrip(0);
  const pollId = await createTripPoll(trip.owner, trip.tripId);
  const run = await pollWaitRun(trip, pollId, [{ kind: 'allVoted' }]);
  await trip.owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  const met = await run.wait();
  expect(met?.status).toBe('met');
  await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, {
    waitId: run.waitId
  });
  expect(await run.wait()).toMatchObject({
    outcome: { reason: 'met' },
    resolvedAt: met?.resolvedAt,
    status: 'met'
  });
});

test('closing the poll meets a closed rule and zero-eligible polls never meet allVoted', async () => {
  const trip = await setupTrip(0);
  const pollId = await createTripPoll(trip.owner, trip.tripId);
  const run = await pollWaitRun(trip, pollId, [{ kind: 'closed' }]);
  await trip.owner.client.mutation(api.routes.polls.close.run, { pollId });
  expect((await run.wait())?.outcome?.reason).toBe('met');
  await trip.owner.client.mutation(api.routes.trips.travelers.set.run, {
    status: 'not_going',
    tripId: trip.tripId
  });
  const empty = await createTripPoll(trip.owner, trip.tripId, { question: 'Nobody?' });
  const zero = await pollWaitRun(trip, empty, [{ kind: 'allVoted' }]);
  expect((await zero.wait())?.status).toBe('waiting');
});

test('deleting a poll cancels its waits with a note', async () => {
  const trip = await setupTrip(0);
  const pollId = await createTripPoll(trip.owner, trip.tripId);
  const run = await pollWaitRun(trip, pollId, [{ kind: 'closed' }]);
  await trip.owner.client.mutation(api.routes.polls.remove.run, { pollId });
  expect(await run.wait()).toMatchObject({
    outcome: { reason: 'cancelled', summary: 'Cancelled: the watched poll was deleted' },
    status: 'cancelled'
  });
});

test('a wait refuses a poll from another trip and an empty rule', async () => {
  const trip = await setupTrip(0);
  const otherTripId = await trip.owner.client.action(api.routes.trips.create.run, {
    input: tripInput()
  });
  const pollId = await createTripPoll(trip.owner, otherTripId);
  await expect(pollWaitRun(trip, pollId, [{ kind: 'allVoted' }])).rejects.toThrow(
    'That poll belongs to another trip'
  );
  const own = await createTripPoll(trip.owner, trip.tripId);
  await expect(pollWaitRun(trip, own, [])).rejects.toThrow('Choose at least one poll rule');
});

test('a wait refuses malformed rules', async () => {
  const trip = await setupTrip(0);
  const pollId = await createTripPoll(trip.owner, trip.tripId);
  const refused: Array<[Parameters<typeof pollWaitRun>[2], string]> = [
    [[{ count: 0, kind: 'quorum' }], 'A quorum count must be a whole number'],
    [[{ count: 1.5, kind: 'quorum' }], 'A quorum count must be a whole number'],
    [[{ kind: 'quorum', percent: 0 }], 'A quorum percent must be between 1 and 100'],
    [[{ kind: 'quorum', percent: 101 }], 'A quorum percent must be between 1 and 100'],
    [[{ kind: 'optionVotes', min: 0 }], 'An option vote minimum must be a whole number']
  ];
  for (const [rule, message] of refused) {
    await expect(pollWaitRun(trip, pollId, rule)).rejects.toThrow(message);
  }
});

test('a chat run cannot wait on another chat’s poll or a missing poll', async () => {
  const trip = await setupTrip(1);
  const members = trip.users.map((user) => user.userId);
  const chat = (title: string) =>
    trip.owner.client.mutation(api.routes.discussions.create.run, {
      clientRequestId: crypto.randomUUID(),
      memberUserIds: members,
      title,
      tripId: trip.tripId
    });
  const [mine, theirs] = [await chat('Mine'), await chat('Theirs')];
  const pollId = await trip.owner.client.mutation(api.routes.polls.create.run, {
    discussionId: theirs,
    multiSelect: false,
    options: ['A', 'B'],
    question: 'Theirs?'
  });
  await expect(
    pollWaitRun(trip, pollId, [{ kind: 'allVoted' }], { discussionId: mine })
  ).rejects.toThrow('That poll belongs to another chat');
  await trip.owner.test.run((ctx) => ctx.db.delete('polls', pollId));
  await expect(pollWaitRun(trip, pollId, [{ kind: 'allVoted' }])).rejects.toThrow('Poll not found');
});

test('a poll removed without a signal reads as deleted when the wait expires', async () => {
  const trip = await setupTrip(0);
  const pollId = await createTripPoll(trip.owner, trip.tripId);
  const run = await pollWaitRun(trip, pollId, [{ kind: 'allVoted' }]);
  await trip.owner.test.run((ctx) => ctx.db.delete('polls', pollId));
  await expect(
    trip.owner.test.query(internal.modules.assistant.waits.functions.resumeContext, {
      waitId: run.waitId
    })
  ).resolves.toMatchObject({ kind: 'poll', label: 'a deleted poll' });
  await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, {
    waitId: run.waitId
  });
  expect(await run.wait()).toMatchObject({
    outcome: {
      reason: 'deadline',
      snapshot: { question: 'Deleted poll', voters: [] },
      summary: 'The poll was deleted'
    },
    status: 'expired'
  });
});

test('deleting a chat removes its polls and cancels their waits', async () => {
  const trip = await setupTrip(1);
  const discussionId = await trip.owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: trip.users.map((user) => user.userId),
    title: 'Dinner',
    tripId: trip.tripId
  });
  const pollId = await trip.owner.client.mutation(api.routes.polls.create.run, {
    discussionId,
    multiSelect: false,
    options: ['A', 'B'],
    question: 'Dinner?'
  });
  await trip.owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  const run = await pollWaitRun(trip, pollId, [{ kind: 'allVoted' }]);
  await trip.owner.test.mutation(internal.modules.discussions.threads.cleanup.purgeDiscussion, {
    discussionId
  });
  expect(await run.wait()).toMatchObject({
    outcome: { reason: 'cancelled', snapshot: { question: 'Dinner?', voters: ['Test Person'] } },
    status: 'cancelled'
  });
  await trip.owner.test.run(async (ctx) => {
    expect(await ctx.db.get('polls', pollId)).toBeNull();
    expect(
      await ctx.db
        .query('pollVotes')
        .withIndex('by_pollId_and_userId', (query) => query.eq('pollId', pollId))
        .take(1)
    ).toEqual([]);
  });
});

test(
  'deleting a trip or a group removes their polls and cancels their waits',
  { timeout: 30_000 },
  async () => {
    const trip = await setupTrip(0);
    const tripPoll = await createTripPoll(trip.owner, trip.tripId);
    await trip.owner.client.mutation(api.routes.polls.vote.run, {
      optionIds: ['o1'],
      pollId: tripPoll
    });
    const groupPoll = await trip.owner.client.mutation(api.routes.polls.create.run, {
      multiSelect: false,
      options: ['A', 'B'],
      question: 'Group?'
    });
    const onTrip = await pollWaitRun(trip, tripPoll, [{ kind: 'closed' }]);
    const onGroup = await pollWaitRun(trip, groupPoll, [{ kind: 'closed' }], { tripId: null });
    const left = () =>
      trip.owner.test.run(async (ctx) => {
        const [open, closed] = await Promise.all([
          ctx.db
            .query('polls')
            .withIndex('by_organizationId_and_status', (query) =>
              query.eq('organizationId', trip.owner.organizationId!).eq('status', 'open')
            )
            .take(1),
          ctx.db
            .query('polls')
            .withIndex('by_organizationId_and_status', (query) =>
              query.eq('organizationId', trip.owner.organizationId!).eq('status', 'closed')
            )
            .take(1)
        ]);
        return open.length + closed.length;
      });
    for (let step = 0; step < 100 && (await left()) > 0; step++) {
      await trip.owner.test.mutation(
        internal.modules.organizations.cleanup.removeOrganizationData,
        {
          organizationId: trip.owner.organizationId as string
        }
      );
    }
    expect(await left()).toBe(0);
    expect(
      await trip.owner.test.run(async (ctx) => {
        const votes = await Promise.all(
          [tripPoll, groupPoll].map((pollId) =>
            ctx.db
              .query('pollVotes')
              .withIndex('by_pollId_and_userId', (query) => query.eq('pollId', pollId))
              .take(1)
          )
        );
        return votes.flat().length;
      })
    ).toBe(0);
    expect((await onTrip.wait())?.status).toBe('cancelled');
    expect((await onGroup.wait())?.status).toBe('cancelled');
  }
);

test('a research chat poll counts the trip travelers and survives a vanished chat', async () => {
  const trip = await setupTrip(1);
  const discussionId = await trip.owner.client.mutation(
    api.routes.discussions.research.create.run,
    {
      clientRequestId: crypto.randomUUID(),
      title: 'Hotels',
      tripId: trip.tripId
    }
  );
  const pollId = await trip.owner.client.mutation(api.routes.polls.create.run, {
    discussionId,
    multiSelect: false,
    options: ['A', 'B'],
    question: 'Which hotel?'
  });
  await expect(
    trip.owner.client.query(api.routes.polls.get.run, { pollId })
  ).resolves.toMatchObject({ eligibleCount: 2, tripId: trip.tripId });
  const run = await pollWaitRun(trip, pollId, [{ kind: 'allVoted' }]);
  await trip.owner.test.run((ctx) => ctx.db.delete('discussions', discussionId));
  await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, {
    waitId: run.waitId
  });
  expect(await run.wait()).toMatchObject({
    outcome: { progress: '0 of 2 voted', reason: 'deadline' },
    status: 'expired'
  });
});

test('a run only waits on polls its creator can read', async () => {
  const trip = await setupTrip(2);
  const [author, partner] = trip.users;
  if (!author || !partner) throw new Error('Expected members');
  const privateChat = await trip.owner.test.run((ctx) =>
    ctx.db.insert('discussions', {
      clientRequestId: crypto.randomUUID(),
      createdBy: { name: 'Author', userId: author.userId },
      kind: 'assistant',
      organizationId: trip.owner.organizationId as string,
      shortId: `pv${Math.random().toString(36).slice(2, 6)}`,
      title: 'Mine',
      updatedAt: Date.now()
    })
  );
  const privatePoll = await author.client.mutation(api.routes.polls.create.run, {
    discussionId: privateChat,
    multiSelect: false,
    options: ['A', 'B'],
    question: 'Private?'
  });
  await expect(
    pollWaitRun(trip, privatePoll, [{ kind: 'allVoted' }], { tripId: null })
  ).rejects.toThrow('Poll not found');
  const pairChat = await author.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [partner.userId],
    title: 'Just us'
  });
  const pairPoll = await author.client.mutation(api.routes.polls.create.run, {
    discussionId: pairChat,
    multiSelect: false,
    options: ['A', 'B'],
    question: 'Us?'
  });
  await expect(
    pollWaitRun(trip, pairPoll, [{ kind: 'allVoted' }], { tripId: null })
  ).rejects.toThrow('Poll not found');
});
