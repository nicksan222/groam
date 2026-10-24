import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { createTripPoll, insertAgentRun, tripPolls } from '#testing/polls';
import { setupTrip, tripInput } from '#testing/trips';

type Trip = Awaited<ReturnType<typeof setupTrip>>;

async function groupChat(trip: Trip, memberUserIds: string[], tripId = trip.tripId) {
  return await trip.owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds,
    title: 'Plans',
    tripId
  });
}

async function assistantChat(trip: Trip) {
  return await trip.owner.test.run((ctx) =>
    ctx.db.insert('discussions', {
      clientRequestId: crypto.randomUUID(),
      createdBy: { name: 'Owner', userId: trip.owner.userId },
      kind: 'assistant',
      organizationId: trip.owner.organizationId as string,
      shortId: `as${Math.random().toString(36).slice(2, 6)}`,
      title: 'Assistant',
      updatedAt: Date.now()
    })
  );
}

test('a chat poll takes the chat trip and only chat members can see or vote', async () => {
  const trip = await setupTrip(2);
  const [inChat, outside] = trip.users;
  if (!inChat || !outside) throw new Error('Expected members');
  const discussionId = await groupChat(trip, [inChat.userId]);
  const pollId = await trip.owner.client.mutation(api.routes.polls.create.run, {
    discussionId,
    multiSelect: true,
    options: ['Sushi', 'Tapas'],
    question: 'Dinner?'
  });
  await expect(
    trip.owner.client.query(api.routes.polls.get.run, { pollId })
  ).resolves.toMatchObject({ discussionId, eligibleCount: 2, tripId: trip.tripId });
  await inChat.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1', 'o2'], pollId });
  await expect(outside.client.query(api.routes.polls.get.run, { pollId })).rejects.toThrow(
    'Poll not found'
  );
  await expect(outside.client.mutation(api.routes.polls.retract.run, { pollId })).rejects.toThrow(
    'Poll not found'
  );
  await expect(
    outside.client.query(api.routes.polls.list.discussion.run, { discussionId })
  ).rejects.toThrow('Discussion not found');
  await expect(tripPolls(outside.client, trip.tripId)).resolves.toEqual([]);
  await expect(
    inChat.client.query(api.routes.polls.list.discussion.run, { discussionId })
  ).resolves.toMatchObject([{ myOptionIds: ['o1', 'o2'], votedCount: 1 }]);
  await expect(tripPolls(trip.owner.client, trip.tripId)).resolves.toHaveLength(1);
});

test('a chat poll refuses another trip, and options must fit', async () => {
  const trip = await setupTrip(1);
  const discussionId = await groupChat(
    trip,
    trip.users.map((user) => user.userId)
  );
  const otherTripId = await trip.owner.client.action(api.routes.trips.create.run, {
    input: tripInput()
  });
  const base = { discussionId, multiSelect: false, options: ['A', 'B'], question: 'Q?' };
  await expect(
    trip.owner.client.mutation(api.routes.polls.create.run, { ...base, tripId: otherTripId })
  ).rejects.toThrow('The poll trip must match the chat trip');
  await expect(
    trip.owner.client.mutation(api.routes.polls.create.run, {
      ...base,
      options: ['A', 'x'.repeat(81)]
    })
  ).rejects.toThrow('Each option needs 1 to 80 characters');
});

test('a private assistant chat poll counts only its owner', async () => {
  const trip = await setupTrip(1);
  const discussionId = await assistantChat(trip);
  const pollId = await trip.owner.client.mutation(api.routes.polls.create.run, {
    discussionId,
    multiSelect: false,
    options: ['A', 'B'],
    question: 'Just me?'
  });
  await expect(
    trip.owner.client.query(api.routes.polls.get.run, { pollId })
  ).resolves.toMatchObject({ eligibleCount: 1, tripId: null });
});

test('a poll whose trip is gone reads as missing', async () => {
  const trip = await setupTrip(0);
  const pollId = await createTripPoll(trip.owner, trip.tripId);
  await trip.owner.test.run((ctx) => ctx.db.delete('trips', trip.tripId));
  await expect(trip.owner.client.query(api.routes.polls.get.run, { pollId })).rejects.toThrow(
    'Poll not found'
  );
});

test('the person who started an agent run manages its poll', async () => {
  const trip = await setupTrip(2);
  const [starter, other] = trip.users;
  if (!starter || !other) throw new Error('Expected members');
  const runId = await insertAgentRun(trip, {
    createdBy: { name: 'Starter', userId: starter.userId }
  });
  const pollId = await trip.owner.test.run((ctx) =>
    ctx.db.insert('polls', {
      createdBy: { agentId: 'groam', kind: 'agent', name: 'Groam', runId },
      multiSelect: false,
      options: [
        { id: 'o1', label: 'A' },
        { id: 'o2', label: 'B' }
      ],
      organizationId: trip.owner.organizationId as string,
      question: 'Agent asks?',
      status: 'open',
      tripId: trip.tripId,
      updatedAt: Date.now()
    })
  );
  await expect(starter.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({
    canClose: true,
    createdBy: { kind: 'agent', name: 'Groam' }
  });
  await expect(other.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({
    canClose: false
  });
  await expect(other.client.mutation(api.routes.polls.close.run, { pollId })).rejects.toThrow(
    'Only the poll creator or a group admin'
  );
  await starter.client.mutation(api.routes.polls.close.run, { pollId });
  await starter.client.mutation(api.routes.polls.close.run, { pollId });
  await expect(starter.client.mutation(api.routes.polls.retract.run, { pollId })).rejects.toThrow(
    'This poll is closed'
  );
});

test('createPoll places the poll in the shared chat, else the trip, else the group', async () => {
  const trip = await setupTrip(1);
  const [member] = trip.users;
  if (!member) throw new Error('Expected a member');
  const create = async (asRun: Id<'agentRuns'>, activeTripId?: Id<'trips'>) => {
    const { pollId, waitId } = await trip.owner.test.mutation(
      internal.modules.assistant.model.polls.createPoll,
      {
        ...(activeTripId ? { activeTripId } : {}),
        asRun,
        multiSelect: false,
        options: ['A', 'B'],
        question: 'Where?'
      }
    );
    expect(waitId).toBeNull();
    return await trip.owner.client.query(api.routes.polls.get.run, { pollId });
  };
  const chat = await groupChat(trip, [member.userId]);
  await expect(create(await insertAgentRun(trip, { discussionId: chat }))).resolves.toMatchObject({
    createdBy: { kind: 'agent', name: 'Groam' },
    discussionId: chat,
    tripId: trip.tripId
  });
  await expect(create(await insertAgentRun(trip))).resolves.toMatchObject({
    discussionId: null,
    tripId: trip.tripId
  });
  const otherTripId = await trip.owner.client.action(api.routes.trips.create.run, {
    input: tripInput()
  });
  await expect(create(await insertAgentRun(trip), otherTripId)).resolves.toMatchObject({
    tripId: otherTripId
  });
  const privateChat = await assistantChat(trip);
  await expect(
    create(await insertAgentRun(trip, { discussionId: privateChat, tripId: null }))
  ).resolves.toMatchObject({ discussionId: null, eligibleCount: 2, tripId: null });
});
