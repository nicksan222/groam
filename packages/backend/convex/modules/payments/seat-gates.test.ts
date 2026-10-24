import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { agentWorkflow } from '#convex/modules/assistant/engine/manager';
import { deliverCompleted, enablePayments, pay, stubStripe } from '#testing/payments';
import { createTripPoll, insertAgentRun, pollWaitRun, tripPolls } from '#testing/polls';
import { setupTrip } from '#testing/trips';
import { draftChangedVersion } from '#testing/versions';
import { createIssue, waitHelpers } from '#testing/waits';

// oxlint-disable-next-line jest/no-export -- convex-test discovers test-only functions through module exports.
export const idle = agentWorkflow.define({ args: {} }).handler(async (step): Promise<void> => {
  await step.awaitEvent({ name: 'never' });
});

const { refusal } = waitHelpers('modules/payments/seat-gates.test:idle');
const checkout = api.routes.trips.payments.checkout.run;
const paginationOpts = { cursor: null, numItems: 25 };

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** A paid trip: the owner is free, the members have not bought a seat yet. */
async function billableTrip(memberCount = 1) {
  vi.useFakeTimers();
  enablePayments();
  const stripe = stubStripe();
  const trip = await setupTrip(memberCount);
  const member = trip.users[0]!;
  const buySeatFor = async (buyer: typeof member) => {
    const { url } = await buyer.client.action(checkout, { tripId: trip.tripId });
    const session = [...stripe.sessions.values()].find((item) => item.url === url);
    if (!session) throw new Error('Expected an open Checkout session');
    expect((await deliverCompleted(trip.owner.test, pay(session))).status).toBe(200);
  };
  return { ...trip, buySeat: () => buySeatFor(member), buySeatFor, member };
}

test('agent runs on a paid trip need the viewer’s seat', async () => {
  const trip = await billableTrip();
  const { buySeat, member, owner, tripId } = trip;
  const issueId = await createIssue(trip, 'Rainy-day option');
  const issueRun = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' },
    issueId
  });
  if (!issueRun) throw new Error('Expected a queued run');
  const { proposalId } = await draftChangedVersion(owner, tripId);
  await owner.client.action(api.routes.trips.versions.submit.run, { proposalId });
  const chatRun = await insertAgentRun(trip);
  const runIds = [issueRun, chatRun];

  const query = (client: typeof owner.client) => ({
    issueRun: () => client.query(api.routes.agents.runs.issue.run, { issueId }),
    list: async (agentId: 'groam' | 'issue') =>
      (await client.query(api.routes.agents.runs.list.run, { agentId, paginationOpts })).page.map(
        (run) => run.id
      ),
    proposalRun: () => client.query(api.routes.agents.runs.proposal.run, { proposalId })
  });
  const asMember = query(member.client);
  const asOwner = query(owner.client);

  for (const runId of runIds) {
    await expect(member.client.query(api.routes.agents.runs.get.run, { runId })).rejects.toThrow(
      'Agent run not found'
    );
    await expect(
      member.client.query(api.routes.agents.runs.events.run, { paginationOpts, runId })
    ).rejects.toThrow('Agent run not found');
  }
  expect(await asMember.list('issue')).toEqual([]);
  expect(await asMember.list('groam')).toEqual([]);
  expect(await asMember.issueRun()).toBeNull();
  expect(await asMember.proposalRun()).toBeNull();
  expect(await asOwner.list('issue')).toContain(issueRun);
  expect(await asOwner.issueRun()).not.toBeNull();
  expect(await asOwner.proposalRun()).not.toBeNull();

  await buySeat();
  for (const runId of runIds) {
    await expect(
      member.client.query(api.routes.agents.runs.get.run, { runId })
    ).resolves.toMatchObject({ id: runId, related: { tripName: expect.any(String) } });
  }
  expect(await asMember.list('issue')).toContain(issueRun);
  expect(await asMember.issueRun()).not.toBeNull();
  expect(await asMember.proposalRun()).not.toBeNull();
});

test('trip polls need the viewer’s seat to read, list, or create', async () => {
  const trip = await billableTrip();
  const { buySeat, member, owner, tripId } = trip;
  const pollId = await createTripPoll(owner, tripId);

  await expect(member.client.query(api.routes.polls.get.run, { pollId })).rejects.toThrow(
    'Poll not found'
  );
  expect(await tripPolls(member.client, tripId)).toEqual([]);
  expect(await tripPolls(owner.client, tripId)).toHaveLength(1);
  await expect(
    member.client.mutation(api.routes.polls.create.run, {
      multiSelect: false,
      options: ['Sushi', 'Tapas'],
      question: 'Where should we eat?',
      tripId
    })
  ).rejects.toThrow('Trip not found');

  await buySeat();
  await expect(member.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({
    id: pollId
  });
  expect(await tripPolls(member.client, tripId)).toHaveLength(1);
});

test('trip research needs the viewer’s seat', async () => {
  const { buySeat, member, owner, tripId } = await billableTrip();
  const discussionId = await owner.client.mutation(api.routes.discussions.research.create.run, {
    brief: 'Kid friendly options',
    clientRequestId: crypto.randomUUID(),
    title: 'Museums in Lisbon',
    tripId
  });

  await expect(
    member.client.query(api.routes.discussions.research.get.run, { discussionId })
  ).rejects.toThrow('Discussion not found');
  await expect(
    owner.client.query(api.routes.discussions.research.get.run, { discussionId })
  ).resolves.toBeDefined();

  await buySeat();
  await expect(
    member.client.query(api.routes.discussions.research.get.run, { discussionId })
  ).resolves.toBeDefined();
});

test('an agent acting for an unseated member cannot watch the trip’s issues, ideas, or RSVPs', async () => {
  const trip = await billableTrip();
  const { buySeat, member, owner, tripId } = trip;
  const issueId = await createIssue(trip, 'Pick a hotel');
  const { proposalId } = await draftChangedVersion(owner, tripId);
  const createdBy = { name: 'Member', userId: member.userId };
  const conditions = [
    [{ issueId, kind: 'issue', until: 'resolved' } as const, 'Issue not found'],
    [{ kind: 'proposal', proposalId, until: 'approved' } as const, 'Idea not found'],
    [{ kind: 'rsvp', rule: { going: 1 }, tripId } as const, 'Trip not found']
  ] as const;

  for (const [condition, message] of conditions) {
    expect(await refusal(trip, condition, { createdBy })).toBe(message);
  }
  await buySeat();
  for (const [condition] of conditions) {
    expect(await refusal(trip, condition, { createdBy })).toBe('');
  }
});

test('travelers without a seat are not eligible voters, so poll waits can resolve', async () => {
  const trip = await billableTrip(2);
  const { buySeatFor, member, owner, tripId, users } = trip;
  const unseated = users[1]!;
  const pollId = await createTripPoll(owner, tripId);
  const run = await pollWaitRun(trip, pollId, [{ kind: 'allVoted' }], {
    workflow: 'modules/payments/seat-gates.test:idle'
  });
  const eligibleCount = () =>
    owner.client.query(api.routes.polls.get.run, { pollId }).then((poll) => poll.eligibleCount);

  expect(await eligibleCount()).toBe(1);
  await buySeatFor(member);
  expect(await eligibleCount()).toBe(2);
  await expect(
    unseated.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId })
  ).rejects.toThrow('Poll not found');

  await owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
  expect((await run.wait())?.status).toBe('waiting');
  await member.client.mutation(api.routes.polls.vote.run, { optionIds: ['o2'], pollId });
  expect(await run.wait()).toMatchObject({
    outcome: { progress: '2 of 2 voted', reason: 'met' },
    status: 'met'
  });
});

test('a wait on a trip shows an unseated viewer neither label nor progress', async () => {
  const trip = await billableTrip();
  const { buySeat, member, owner, tripId } = trip;
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [member.userId],
    title: 'Planning'
  });
  const pollId = await createTripPoll(owner, tripId, { question: 'Secret dinner?' });
  const suspended = await pollWaitRun(trip, pollId, [{ kind: 'allVoted' }], {
    discussionId,
    workflow: 'modules/payments/seat-gates.test:idle'
  });
  await owner.test.run((ctx) =>
    ctx.db.patch('agentRuns', suspended.runId, {
      activeWaitId: suspended.waitId,
      status: 'waiting'
    })
  );
  const waits = (client: typeof owner.client) =>
    client.query(api.routes.agents.waits.discussion.run, { discussionId });

  expect(await waits(owner.client)).toEqual([
    expect.objectContaining({ label: expect.stringContaining('Secret dinner?') })
  ]);
  expect(await waits(member.client)).toEqual([
    expect.objectContaining({ label: "Waiting on a trip you haven't joined", progress: null })
  ]);
  await buySeat();
  expect(await waits(member.client)).toEqual([
    expect.objectContaining({ label: expect.stringContaining('Secret dinner?') })
  ]);
});

test('the agents roster and run list skip runs on trips the viewer has no seat on', async () => {
  const trip = await billableTrip();
  const { buySeat, member, owner } = trip;
  const loose = await insertAgentRun(trip, { tripId: null });
  const hidden = [
    await insertAgentRun(trip),
    await insertAgentRun(trip),
    await insertAgentRun(trip),
    await insertAgentRun(trip)
  ];
  // Hidden runs are the newest; the member's page still fills with the older visible one.
  const firstPage = await member.client.query(api.routes.agents.runs.list.run, {
    agentId: 'groam',
    paginationOpts: { cursor: null, numItems: 1 }
  });
  expect(firstPage.page.map((run) => run.id)).toEqual([loose]);
  const roster = await member.client.query(api.routes.agents.get.run, { agentId: 'groam' });
  expect(roster.latestRun?.id).toBe(loose);
  expect(roster.activeRunCount).toBe(1);
  const ownerRoster = await owner.client.query(api.routes.agents.get.run, { agentId: 'groam' });
  expect(ownerRoster.activeRunCount).toBe(1 + hidden.length);

  await buySeat();
  const after = await member.client.query(api.routes.agents.get.run, { agentId: 'groam' });
  expect(after.activeRunCount).toBe(1 + hidden.length);
});

test('a research run on a trip needs the viewer’s seat', async () => {
  const trip = await billableTrip();
  const { buySeat, member, tripId } = trip;
  const runId = await insertAgentRun(trip, {
    createdBy: { name: 'Member', userId: member.userId },
    tripId
  });
  await trip.owner.test.run((ctx) =>
    ctx.db.patch('agentRuns', runId, { researchTask: { effort: 'standard', topic: 'Museums' } })
  );

  await expect(member.client.query(api.routes.agents.runs.get.run, { runId })).rejects.toThrow(
    'Agent run not found'
  );
  await buySeat();
  await expect(
    member.client.query(api.routes.agents.runs.get.run, { runId })
  ).resolves.toMatchObject({ id: runId });
});

test('a free trip leaves its content visible to members without a purchase', async () => {
  const trip = await billableTrip();
  const { member, owner, tripId } = trip;
  await owner.test.run((ctx) => ctx.db.patch('trips', tripId, { paymentRequired: false }));
  const pollId = await createTripPoll(owner, tripId);
  const runId = await insertAgentRun(trip);

  await expect(member.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({
    id: pollId
  });
  expect(await tripPolls(member.client, tripId)).toHaveLength(1);
  await expect(
    member.client.query(api.routes.agents.runs.get.run, { runId })
  ).resolves.toMatchObject({ id: runId });
  const catalog = await member.client.query(
    internal.modules.assistant.model.index.contextCatalog,
    {}
  );
  expect(catalog.some((item) => item.tripId === tripId)).toBe(true);
});

test('with a pass provider every member reads the trip, even when payment is required', async () => {
  const trip = await setupTrip(1);
  const { member, owner, tripId } = { ...trip, member: trip.users[0]! };
  const pollId = await createTripPoll(owner, tripId);
  const runId = await insertAgentRun(trip);

  await expect(member.client.query(api.routes.polls.get.run, { pollId })).resolves.toMatchObject({
    id: pollId
  });
  await expect(
    member.client.query(api.routes.agents.runs.get.run, { runId })
  ).resolves.toMatchObject({ id: runId });
  const catalog = await member.client.query(
    internal.modules.assistant.model.index.contextCatalog,
    {}
  );
  expect(catalog.some((item) => item.tripId === tripId)).toBe(true);
});

test('an organization admin without a seat is refused like any other member', async () => {
  const trip = await billableTrip();
  const { addUser, owner, tripId } = trip;
  const admin = await addUser('Unseated admin', 'admin');
  const pollId = await createTripPoll(owner, tripId);
  const runId = await insertAgentRun(trip);

  await expect(admin.client.query(api.routes.polls.get.run, { pollId })).rejects.toThrow(
    'Poll not found'
  );
  await expect(admin.client.query(api.routes.agents.runs.get.run, { runId })).rejects.toThrow(
    'Agent run not found'
  );
  await expect(
    admin.client.mutation(api.routes.trips.versions.create.run, { tripId })
  ).rejects.toThrow('Trip not found');
  const catalog = await admin.client.query(
    internal.modules.assistant.model.index.contextCatalog,
    {}
  );
  expect(catalog.some((item) => item.tripId === tripId)).toBe(false);
});
