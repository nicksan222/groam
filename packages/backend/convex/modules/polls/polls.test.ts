import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { createTripPoll, tripPolls } from '#testing/polls';
import { openTripDraft, setupGroup, setupTrip } from '#testing/trips';

test('travelers vote, change, and retract; tallies follow', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a member');
  const pollId = await createTripPoll(owner, tripId);
  await owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  await member.client.mutation(api.routes.polls.vote.run, { optionIds: ['o2'], pollId });
  await member.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  await expect(owner.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({
    eligibleCount: 2,
    myOptionIds: ['o1'],
    tallies: [
      { count: 2, label: 'Sushi' },
      { count: 0, label: 'Tapas' }
    ],
    votedCount: 2
  });
  await member.client.mutation(api.routes.polls.retract.run, { pollId });
  await expect(member.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({
    myOptionIds: [],
    votedCount: 1
  });
});

test('updatedAt moves when a poll is closed, not when people vote', async () => {
  const { owner, tripId } = await setupTrip(0);
  const pollId = await createTripPoll(owner, tripId);
  const created = await owner.client.query(api.routes.polls.get.run, { pollId });
  await owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  const voted = await owner.client.query(api.routes.polls.get.run, { pollId });
  expect(voted.updatedAt).toBe(created.updatedAt);
  await owner.client.mutation(api.routes.polls.close.run, { pollId });
  const closed = await owner.client.query(api.routes.polls.get.run, { pollId });
  expect(closed.closedAt).not.toBeNull();
  expect(closed.updatedAt).toBe(closed.closedAt);
});

test('single-select polls take exactly one known option', async () => {
  const { owner, tripId } = await setupTrip(0);
  const pollId = await createTripPoll(owner, tripId);
  await expect(
    owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1', 'o2'], pollId })
  ).rejects.toThrow('Pick one option');
  await expect(
    owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['nope'], pollId })
  ).rejects.toThrow('Unknown option');
});

test('creating a poll validates question, option count, and close time', async () => {
  const { owner, tripId } = await setupTrip(0);
  const base = { multiSelect: false, options: ['A', 'B'], question: 'Where?', tripId };
  const create = (input: Partial<typeof base> & { closesAt?: number }) =>
    owner.client.mutation(api.routes.polls.create.run, { ...base, ...input });
  await expect(create({ options: ['Only'] })).rejects.toThrow('2 to 10 options');
  await expect(create({ options: ['A', 'a'] })).rejects.toThrow('Options must be different');
  await expect(create({ question: '  ' })).rejects.toThrow('question');
  await expect(create({ closesAt: Date.now() - 1 })).rejects.toThrow('close in the future');
  await expect(create({ closesAt: Date.now() + 15 * 24 * 60 * 60 * 1000 })).rejects.toThrow(
    'at most 14 days'
  );
});

test('outsiders cannot read or vote; non-creators cannot close; admins can', async () => {
  const group = await setupGroup();
  const member = await group.addUser('Member');
  const admin = await group.addUser('Admin', 'admin');
  const pollId = await group.owner.client.mutation(api.routes.polls.create.run, {
    multiSelect: false,
    options: ['Beach', 'Mountains'],
    question: 'Next trip?'
  });
  const outsider = await createOutsiderClient(group.owner.test);
  await expect(outsider.client.query(api.routes.polls.get.run, { pollId })).rejects.toThrow(
    'Poll not found'
  );
  await expect(
    outsider.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId })
  ).rejects.toThrow('Poll not found');
  await expect(member.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({
    canDelete: false
  });
  await expect(admin.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({
    canDelete: true
  });
  await expect(member.client.mutation(api.routes.polls.close.run, { pollId })).rejects.toThrow(
    'Only the poll creator or a group admin'
  );
  await expect(member.client.mutation(api.routes.polls.remove.run, { pollId })).rejects.toThrow(
    'Only the poll creator or a group admin'
  );
  await admin.client.mutation(api.routes.polls.close.run, { pollId });
  await expect(
    member.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId })
  ).rejects.toThrow('This poll is closed');
});

test('a traveler marked not going is not eligible on a trip poll', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a member');
  await member.client.mutation(api.routes.trips.travelers.set.run, {
    status: 'not_going',
    tripId
  });
  const pollId = await createTripPoll(owner, tripId);
  await expect(
    member.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId })
  ).rejects.toThrow('You cannot vote on this poll');
  await expect(owner.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({
    canVote: true,
    eligibleCount: 1
  });
});

test('a poll with closesAt closes itself', async () => {
  const { owner, tripId } = await setupTrip(0);
  const pollId = await createTripPoll(owner, tripId, { closesAt: Date.now() + 60 * 60 * 1000 });
  await owner.test.mutation(internal.modules.polls.functions.closeScheduled, { pollId });
  await expect(owner.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({
    canClose: false,
    canVote: false,
    status: 'closed'
  });
});

test('trip polls list on the trip; deleting removes the poll', async () => {
  const { owner, tripId } = await setupTrip(0);
  const pollId = await createTripPoll(owner, tripId);
  await expect(tripPolls(owner.client, tripId)).resolves.toMatchObject([
    { canDelete: true, id: pollId, tripId }
  ]);
  await owner.client.mutation(api.routes.polls.remove.run, { pollId });
  await expect(tripPolls(owner.client, tripId)).resolves.toEqual([]);
});

test('polls stay off idea drafts and archived trips; empty votes and retracts are refused or no-ops', async () => {
  const { owner, tripId } = await setupTrip(1);
  const draft = await openTripDraft(owner, tripId);
  await expect(createTripPoll(owner, draft.workingTripId)).rejects.toThrow(
    'Polls belong to the shared trip, not an idea'
  );
  const pollId = await createTripPoll(owner, tripId);
  await expect(
    owner.client.mutation(api.routes.polls.vote.run, { optionIds: [], pollId })
  ).rejects.toThrow('Pick an option');
  await expect(owner.client.mutation(api.routes.polls.retract.run, { pollId })).resolves.toBeNull();
  await owner.client.mutation(api.routes.trips.archive.run, { tripId });
  await expect(createTripPoll(owner, tripId)).rejects.toThrow('Archived trips are read-only');
});

test('closing twice and the scheduled close after a manual close are no-ops', async () => {
  const { owner, tripId } = await setupTrip(0);
  const first = await createTripPoll(owner, tripId, { closesAt: Date.now() + 60 * 60 * 1000 });
  const second = await createTripPoll(owner, tripId, { question: 'Second?' });
  await owner.client.mutation(api.routes.polls.close.run, { pollId: first });
  const closedAt = (await owner.client.query(api.routes.polls.get.run, { pollId: first })).closedAt;
  await owner.client.mutation(api.routes.polls.close.run, { pollId: first });
  await owner.test.mutation(internal.modules.polls.functions.closeScheduled, { pollId: first });
  await expect(
    owner.client.query(api.routes.polls.get.run, { pollId: first })
  ).resolves.toMatchObject({ closedAt, status: 'closed' });
  await expect(tripPolls(owner.client, tripId)).resolves.toMatchObject([{ id: second }]);
  await expect(tripPolls(owner.client, tripId, 'closed')).resolves.toMatchObject([{ id: first }]);
});

test('many trip polls never crowd group polls out of the group list', async () => {
  const { owner, tripId } = await setupTrip(0);
  await owner.test.run(async (ctx) => {
    for (let index = 0; index < 55; index++) {
      await ctx.db.insert('polls', {
        createdBy: { kind: 'user', name: 'Owner', userId: owner.userId },
        multiSelect: false,
        options: [
          { id: 'o1', label: 'A' },
          { id: 'o2', label: 'B' }
        ],
        organizationId: owner.organizationId as string,
        question: `Trip ${index}?`,
        status: 'open',
        tripId,
        updatedAt: Date.now()
      });
    }
  });
  const first = await owner.client.query(api.routes.polls.list.trip.run, {
    paginationOpts: { cursor: null, numItems: 50 },
    status: 'open',
    tripId
  });
  expect(first.page).toHaveLength(50);
  expect(first.isDone).toBe(false);
});

test('an archived trip freezes votes, retractions, and closing', async () => {
  const { owner, tripId } = await setupTrip(0);
  const pollId = await createTripPoll(owner, tripId);
  await owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  await owner.client.mutation(api.routes.trips.archive.run, { tripId });
  await expect(owner.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({
    canClose: false,
    canDelete: false,
    canVote: false
  });
  const archived = 'Archived trips are read-only';
  await expect(
    owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o2'], pollId })
  ).rejects.toThrow(archived);
  await expect(owner.client.mutation(api.routes.polls.retract.run, { pollId })).rejects.toThrow(
    archived
  );
  await expect(owner.client.mutation(api.routes.polls.close.run, { pollId })).rejects.toThrow(
    archived
  );
});

test('a poll cannot borrow another group’s trip or chat, or a trip its chat lacks', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const outsider = await createOutsiderClient(owner.test);
  const chat = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: users.map((user) => user.userId),
    title: 'No trip'
  });
  const base = { multiSelect: false, options: ['A', 'B'], question: 'Q?' };
  await expect(
    outsider.client.mutation(api.routes.polls.create.run, { ...base, tripId })
  ).rejects.toThrow('Trip not found');
  await expect(
    outsider.client.mutation(api.routes.polls.create.run, { ...base, discussionId: chat })
  ).rejects.toThrow('Discussion not found');
  await expect(
    owner.client.mutation(api.routes.polls.create.run, { ...base, discussionId: chat, tripId })
  ).rejects.toThrow('The poll trip must match the chat trip');
});
