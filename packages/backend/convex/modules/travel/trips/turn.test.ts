import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { enablePayments } from '#testing/payments';
import { createTripPoll } from '#testing/polls';
import { setupTrip, tripInput } from '#testing/trips';
import { draftChangedVersion } from '#testing/versions';

const turn = api.routes.trips.turn.run;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

type Trip = Awaited<ReturnType<typeof setupTrip>>;
type Client = Trip['owner']['client'];

const counts = <T extends { tripId: Id<'trips'> }>(result: { trips: T[] }, tripId: Id<'trips'>) =>
  result.trips.find((trip) => trip.tripId === tripId);

async function assignTo(trip: Trip, assignee: { name: string; userId: string }, title: string) {
  const issueId = await trip.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Needs an answer.',
    title,
    tripId: trip.tripId
  });
  await trip.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: { kind: 'user', ...assignee },
    issueId
  });
  return issueId;
}

test('an issue assigned to the viewer counts for them alone', async () => {
  const trip = await setupTrip(1);
  const member = trip.users[0]!;
  const issueId = await assignTo(
    trip,
    { name: 'Group member 1', userId: member.userId },
    'Book it'
  );

  const mine = await member.client.query(turn, {});
  expect(counts(mine, trip.tripId)).toEqual({
    ideas: 0,
    issues: 1,
    polls: 0,
    tripId: trip.tripId
  });
  expect(mine.items).toEqual([
    expect.objectContaining({
      id: issueId,
      kind: 'issue',
      status: 'open',
      title: 'Book it',
      tripId: trip.tripId,
      tripName: 'Summer beach idea'
    })
  ]);
  expect(mine.total).toBe(1);

  // The organizer assigned it, but it is not their turn.
  const owners = await trip.owner.client.query(turn, {});
  expect(owners.items).toEqual([]);
  expect(counts(owners, trip.tripId)?.issues).toBe(0);
});

test('an issue the viewer closed no longer waits on them', async () => {
  const trip = await setupTrip(1);
  const member = trip.users[0]!;
  const issueId = await assignTo(
    trip,
    { name: 'Group member 1', userId: member.userId },
    'Book it'
  );
  await trip.owner.client.mutation(api.routes.trips.issues.status.run, {
    issueId,
    status: 'closed'
  });

  expect((await member.client.query(turn, {})).items).toEqual([]);
});

test(
  'an idea in review waits on a reviewer until they approve it',
  { timeout: 30_000 },
  async () => {
    // Submitting queues the automatic reviewer; fake timers keep it from running.
    vi.useFakeTimers();
    const trip = await setupTrip(1);
    const reviewer = trip.users[0]!;
    const { proposalId } = await draftChangedVersion(trip.owner, trip.tripId);
    await trip.owner.client.action(api.routes.trips.versions.submit.run, { proposalId });

    const before = await reviewer.client.query(turn, {});
    expect(counts(before, trip.tripId)?.ideas).toBe(1);
    expect(before.items).toEqual([
      expect.objectContaining({ id: proposalId, kind: 'idea', status: 'in_review' })
    ]);

    await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
      approved: true,
      proposalId
    });
    const after = await reviewer.client.query(turn, {});
    expect(after.items).toEqual([]);
    expect(counts(after, trip.tripId)?.ideas).toBe(0);
  }
);

test("the viewer's own draft counts and another person's draft is invisible", async () => {
  const trip = await setupTrip(1);
  const member = trip.users[0]!;
  const { proposalId } = await draftChangedVersion(trip.owner, trip.tripId);

  const author = await trip.owner.client.query(turn, {});
  expect(author.items).toEqual([
    expect.objectContaining({
      authorUserId: trip.owner.userId,
      id: proposalId,
      kind: 'idea',
      status: 'draft'
    })
  ]);

  const other = await member.client.query(turn, {});
  expect(other.items).toEqual([]);
  expect(counts(other, trip.tripId)?.ideas).toBe(0);
});

test('an open poll the viewer can vote in counts until they vote', async () => {
  const trip = await setupTrip(1);
  const member = trip.users[0]!;
  const poll = await createTripPoll(trip.owner, trip.tripId);

  const waiting = await member.client.query(turn, {});
  expect(counts(waiting, trip.tripId)?.polls).toBe(1);
  expect(waiting.items).toEqual([
    expect.objectContaining({ id: poll, kind: 'poll', title: 'Where should we eat?' })
  ]);

  const view = await member.client.query(api.routes.polls.get.run, { pollId: poll });
  await member.client.mutation(api.routes.polls.vote.run, {
    optionIds: [view.tallies[0]!.id],
    pollId: poll
  });
  expect((await member.client.query(turn, {})).items).toEqual([]);
});

test('archived trips contribute nothing', async () => {
  const trip = await setupTrip(1);
  const member = trip.users[0]!;
  await assignTo(trip, { name: 'Group member 1', userId: member.userId }, 'Book it');
  await trip.owner.client.mutation(api.routes.trips.archive.run, { tripId: trip.tripId });

  expect(await member.client.query(turn, {})).toMatchObject({ items: [], total: 0, trips: [] });
});

test('a trip the viewer holds no seat on contributes nothing and does not throw', async () => {
  vi.useFakeTimers();
  enablePayments();
  const trip = await setupTrip(1);
  const member = trip.users[0]!;
  await createTripPoll(trip.owner, trip.tripId);
  const owners = await trip.owner.client.query(turn, {});
  expect(owners.trips.map((entry) => entry.tripId)).toEqual([trip.tripId]);

  expect(await member.client.query(turn, {})).toMatchObject({ items: [], total: 0, trips: [] });
});

test('a trip with more ideas than a trip may hold does not break the list', async () => {
  const trip = await setupTrip(1);
  const { proposalId } = await draftChangedVersion(trip.owner, trip.tripId);
  await trip.owner.test.run(async (ctx) => {
    const idea = await ctx.db.get('tripProposals', proposalId);
    if (!idea) throw new Error('Expected the idea');
    const { _creationTime, _id, ...fields } = idea;
    await Promise.all(
      Array.from({ length: 55 }, () => ctx.db.insert('tripProposals', { ...fields }))
    );
  });
  await expect(
    trip.owner.client.query(api.routes.trips.versions.list.run, { tripId: trip.tripId })
  ).rejects.toThrow('Trips support up to 50 ideas');

  const result = await trip.owner.client.query(turn, {});
  expect(counts(result, trip.tripId)?.ideas).toBe(50);
});

test('two members get different lists', async () => {
  const trip = await setupTrip(2);
  const [first, second] = trip.users;
  if (!(first && second)) throw new Error('Expected two members');
  await assignTo(trip, { name: 'Group member 1', userId: first.userId }, 'First only');
  await assignTo(trip, { name: 'Group member 2', userId: second.userId }, 'Second only');

  const titles = async (client: Client) =>
    (await client.query(turn, {})).items.map((item) => item.title);
  expect(await titles(first.client)).toEqual(['First only']);
  expect(await titles(second.client)).toEqual(['Second only']);
});

test('items list soonest due first and cap with a total', async () => {
  const trip = await setupTrip(1);
  const member = trip.users[0]!;
  const later = await assignTo(trip, { name: 'Group member 1', userId: member.userId }, 'Later');
  const sooner = await assignTo(trip, { name: 'Group member 1', userId: member.userId }, 'Sooner');
  const undated = await assignTo(
    trip,
    { name: 'Group member 1', userId: member.userId },
    'Undated'
  );
  const day = 24 * 60 * 60 * 1000;
  await trip.owner.client.mutation(api.routes.trips.issues.due.run, {
    dueAt: Date.now() + 9 * day,
    issueId: later
  });
  await trip.owner.client.mutation(api.routes.trips.issues.due.run, {
    dueAt: Date.now() + 2 * day,
    issueId: sooner
  });

  const result = await member.client.query(turn, {});
  expect(result.items.map((item) => item.id)).toEqual([sooner, later, undated]);
  expect(result.total).toBe(3);
});

test('the list caps at 20 rows and says how many wait in all', async () => {
  const trip = await setupTrip(1);
  const member = trip.users[0]!;
  for (let index = 0; index < 22; index += 1) {
    await assignTo(trip, { name: 'Group member 1', userId: member.userId }, `Chore ${index}`);
  }

  const result = await member.client.query(turn, {});
  expect(result.items).toHaveLength(20);
  expect(result.total).toBe(22);
  expect(counts(result, trip.tripId)?.issues).toBe(22);
});

test('reads 12 trips at most and says there are more', async () => {
  const trip = await setupTrip(0);
  for (let index = 0; index < 12; index += 1) {
    await trip.owner.client.action(api.routes.trips.create.run, {
      input: tripInput({ name: `Trip ${index}` })
    });
  }

  const result = await trip.owner.client.query(turn, {});
  expect(result.checked).toBe(12);
  expect(result.trips).toHaveLength(12);
  expect(result.truncated).toBe(true);

  const few = await setupTrip(0);
  expect(await few.owner.client.query(turn, {})).toMatchObject({ checked: 1, truncated: false });
});

test('favorite trips come first', async () => {
  const trip = await setupTrip(0);
  const second = await trip.owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Newer trip' })
  });
  const before = await trip.owner.client.query(turn, {});
  expect(before.trips.map((entry) => entry.tripId)).toEqual([second, trip.tripId]);

  await trip.owner.client.mutation(api.routes.trips.preferences.favorite.run, {
    favorite: true,
    tripId: trip.tripId
  });
  const after = await trip.owner.client.query(turn, {});
  expect(after.trips.map((entry) => entry.tripId)).toEqual([trip.tripId, second]);
});

test('an idea working copy is not a trip of its own', async () => {
  const trip = await setupTrip(0);
  const { workingTripId } = await draftChangedVersion(trip.owner, trip.tripId);

  const result = await trip.owner.client.query(turn, {});
  expect(result.trips.map((entry) => entry.tripId)).toEqual([trip.tripId]);
  expect(result.trips.some((entry) => entry.tripId === workingTripId)).toBe(false);
});

test(
  'the author’s idea stays their turn after approval, to apply it',
  { timeout: 30_000 },
  async () => {
    vi.useFakeTimers();
    const trip = await setupTrip(0);
    const { proposalId } = await draftChangedVersion(trip.owner, trip.tripId);
    await trip.owner.client.action(api.routes.trips.versions.submit.run, { proposalId });
    await trip.owner.client.mutation(api.routes.trips.versions.approval.run, {
      approved: true,
      proposalId
    });
    const detail = await trip.owner.client.query(api.routes.trips.versions.get.run, { proposalId });
    expect(detail).toMatchObject({ canMerge: true, hasApproved: true });

    // Approved, so nothing left to review; applying it is what waits on the author.
    expect((await trip.owner.client.query(turn, {})).items).toEqual([
      expect.objectContaining({ id: proposalId, kind: 'idea', status: 'in_review' })
    ]);
  }
);

test('a poll the viewer cannot vote in does not wait on them', async () => {
  const trip = await setupTrip(1);
  const member = trip.users[0]!;
  await member.client.mutation(api.routes.trips.travelers.set.run, {
    status: 'not_going',
    tripId: trip.tripId
  });
  await createTripPoll(trip.owner, trip.tripId);

  const result = await member.client.query(turn, {});
  expect(result.items).toEqual([]);
  expect(counts(result, trip.tripId)?.polls).toBe(0);
});

test('items carry the trip’s short id for links', async () => {
  const trip = await setupTrip(1);
  const member = trip.users[0]!;
  await assignTo(trip, { name: 'Group member 1', userId: member.userId }, 'Book it');

  const [item] = (await member.client.query(turn, {})).items;
  expect(item?.tripShortId).toEqual(expect.any(String));
});
