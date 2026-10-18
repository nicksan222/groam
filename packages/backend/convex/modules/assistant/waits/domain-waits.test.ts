import { expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { agentWorkflow } from '#convex/modules/assistant/engine/manager';
import type { WaitCondition } from '#convex/modules/assistant/waits/schema';
import { setupTrip } from '#testing/trips';
import { beginAgentReview, draftChangedVersion } from '#testing/versions';
import { createIssue, submitIdea, waitHelpers } from '#testing/waits';
import { runUntil } from '#testing/workflows';

vi.useRealTimers();

// oxlint-disable-next-line jest/no-export -- convex-test discovers test-only functions through module exports.
export const idle = agentWorkflow.define({ args: {} }).handler(async (step): Promise<void> => {
  // Runs in this file park here so wait events have a live workflow to target.
  await step.awaitEvent({ name: 'never' });
});

const { run: waitRun } = waitHelpers('modules/assistant/waits/domain-waits.test:idle');
const TIMEOUT = { timeout: 30_000 };
type Trip = Awaited<ReturnType<typeof setupTrip>>;

function label(trip: Trip, condition: WaitCondition) {
  return trip.owner.test.run(async (ctx) => {
    // Backend modules load inside convex-test functions only.
    const { conditionLabel } = await import('#convex/modules/assistant/waits/conditions/index');
    return await conditionLabel(ctx, condition);
  });
}

function evaluate(trip: Trip, condition: WaitCondition) {
  return trip.owner.test.run(async (ctx) => {
    const { evaluateCondition } = await import('#convex/modules/assistant/waits/conditions/index');
    return await evaluateCondition(ctx, condition);
  });
}

test('closing an issue meets its resolved wait; other issues stay waiting', TIMEOUT, async () => {
  const trip = await setupTrip(0);
  const watched = await createIssue(trip, 'Visas');
  const other = await createIssue(trip, 'Insurance');
  const a = await waitRun(trip, { issueId: watched, kind: 'issue', until: 'resolved' });
  const b = await waitRun(trip, { issueId: other, kind: 'issue', until: 'resolved' });
  await trip.owner.client.mutation(api.routes.trips.issues.status.run, {
    issueId: watched,
    status: 'in_progress'
  });
  expect(await a.wait()).toMatchObject({ status: 'waiting' });
  await trip.owner.client.mutation(api.routes.trips.issues.status.run, {
    issueId: watched,
    status: 'closed'
  });
  expect(await a.wait()).toMatchObject({
    outcome: { progress: 'resolved', reason: 'met', summary: "issue 'Visas' is closed" },
    status: 'met'
  });
  expect((await b.wait())?.status).toBe('waiting');
  expect(await label(trip, { issueId: other, kind: 'issue', until: 'resolved' })).toBe(
    'issue “Insurance” to be resolved'
  );
});

test('an issue whose rule starts to hold closes and meets its wait', TIMEOUT, async () => {
  const trip = await setupTrip(2);
  const [first] = trip.users;
  if (!first) throw new Error('Expected a member');
  await first.client.mutation(api.routes.trips.travelers.set.run, {
    status: 'maybe',
    tripId: trip.tripId
  });
  const issueId = await createIssue(trip, 'Enough people', { count: 3 });
  const run = await waitRun(trip, { issueId, kind: 'issue', until: 'resolved' });
  expect((await run.wait())?.status).toBe('waiting');
  await first.client.mutation(api.routes.trips.travelers.set.run, {
    status: 'going',
    tripId: trip.tripId
  });
  expect(await run.wait()).toMatchObject({ status: 'met' });
});

test('an approval meets an approved wait; passing on meets a decided wait', TIMEOUT, async () => {
  const trip = await setupTrip(1);
  const [reviewer] = trip.users;
  if (!reviewer) throw new Error('Expected a reviewer');
  const { proposalId } = await draftChangedVersion(trip.owner, trip.tripId);
  await submitIdea(trip, proposalId);
  const approved = await waitRun(trip, { kind: 'proposal', proposalId, until: 'approved' });
  const decided = await waitRun(trip, { kind: 'proposal', proposalId, until: 'decided' });
  expect(await label(trip, { kind: 'proposal', proposalId, until: 'approved' })).toMatch(
    /^idea “.+” to be approved$/
  );
  expect(await label(trip, { kind: 'proposal', proposalId, until: 'decided' })).toMatch(
    /^a decision on idea “.+”$/
  );
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId
  });
  expect(await approved.wait()).toMatchObject({
    outcome: { progress: '1 of 1 approvals', reason: 'met' },
    status: 'met'
  });
  expect((await decided.wait())?.status).toBe('waiting');
  await trip.owner.client.mutation(api.routes.trips.versions.close.run, {
    proposalId,
    reason: 'Not now'
  });
  expect(await decided.wait()).toMatchObject({
    outcome: { snapshot: { kind: 'proposal', status: 'closed' } },
    status: 'met'
  });
  // Passed on: approvals no longer make it approved.
  const late = await waitRun(trip, { kind: 'proposal', proposalId, until: 'approved' });
  expect(await late.wait()).toMatchObject({
    condition: { until: 'approved' },
    status: 'waiting'
  });
});

test(
  'the reviewer agent’s approval reaching the quorum meets an approved wait',
  TIMEOUT,
  async () => {
    const trip = await setupTrip(1);
    const { proposalId } = await draftChangedVersion(trip.owner, trip.tripId);
    await submitIdea(trip, proposalId);
    const approved = await waitRun(trip, { kind: 'proposal', proposalId, until: 'approved' });
    await trip.owner.client.mutation(internal.modules.travel.versions.agent.review.index.finish, {
      ...(await beginAgentReview(trip.owner, proposalId)),
      comments: [],
      proposalId,
      summary: 'Looks good.',
      verdict: 'approve'
    });
    expect(await approved.wait()).toMatchObject({
      outcome: { progress: '1 of 1 approvals', reason: 'met' },
      status: 'met'
    });
  }
);

test('applying an idea meets a decided wait', TIMEOUT, async () => {
  const trip = await setupTrip(1);
  const [reviewer] = trip.users;
  if (!reviewer) throw new Error('Expected a reviewer');
  const { proposalId } = await draftChangedVersion(trip.owner, trip.tripId);
  const decided = await waitRun(trip, { kind: 'proposal', proposalId, until: 'decided' });
  await submitIdea(trip, proposalId);
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId
  });
  await trip.owner.client.action(api.routes.trips.versions.merge.run, { proposalId });
  expect(await decided.wait()).toMatchObject({
    outcome: { snapshot: { status: 'merged' } },
    status: 'met'
  });
});

test('a going count meets once enough members RSVP going', TIMEOUT, async () => {
  const trip = await setupTrip(2);
  const [first, second] = trip.users;
  if (!first || !second) throw new Error('Expected members');
  await first.client.mutation(api.routes.trips.travelers.set.run, {
    status: 'maybe',
    tripId: trip.tripId
  });
  const going = await waitRun(trip, { kind: 'rsvp', rule: { going: 3 }, tripId: trip.tripId });
  expect(await going.wait()).toMatchObject({ status: 'waiting' });
  await second.client.mutation(api.routes.trips.travelers.set.run, {
    status: 'not_going',
    tripId: trip.tripId
  });
  await first.client.mutation(api.routes.trips.travelers.set.run, {
    status: 'going',
    tripId: trip.tripId
  });
  expect((await going.wait())?.status).toBe('waiting');
  await second.client.mutation(api.routes.trips.travelers.set.run, {
    status: 'going',
    tripId: trip.tripId
  });
  await runUntil(trip.owner.test, async () => (await going.wait())?.status === 'met');
  expect(await going.wait()).toMatchObject({
    outcome: {
      progress: '3 of 3 going',
      snapshot: { going: 3, kind: 'rsvp', maybe: 0, notGoing: 0 }
    }
  });
  const tripName = (await trip.owner.test.run((ctx) => ctx.db.get('trips', trip.tripId)))?.name;
  expect(await label(trip, { kind: 'rsvp', rule: { going: 4 }, tripId: trip.tripId })).toBe(
    `4 people going for “${tripName}”`
  );
});

test('claiming an invitation re-checks RSVP waits', TIMEOUT, async () => {
  const trip = await setupTrip(1);
  const [member] = trip.users;
  if (!member) throw new Error('Expected a member');
  const organizationId = trip.owner.organizationId as string;
  await member.client.mutation(api.routes.trips.travelers.set.run, {
    status: 'not_going',
    tripId: trip.tripId
  });
  await trip.owner.test.run((ctx) =>
    ctx.db.insert('tripTravelers', {
      email: 'friend@example.com',
      invitationId: 'invite-rsvp',
      name: 'Friend',
      organizationId,
      status: 'invited',
      tripId: trip.tripId,
      updatedAt: Date.now()
    })
  );
  const going = await waitRun(trip, { kind: 'rsvp', rule: { going: 2 }, tripId: trip.tripId });
  // The claim route needs an invitation-code flow the factory does not model; it calls this.
  await trip.owner.test.run(async (ctx) => {
    const { TripTravelers } = await import('#convex/modules/travel/travelers/index');
    // The member's own not-going row gives way to the invitation they claim.
    const row = await ctx.db
      .query('tripTravelers')
      .withIndex('by_tripId_and_userId', (query) =>
        query.eq('tripId', trip.tripId).eq('userId', member.userId)
      )
      .unique();
    if (row) await ctx.db.delete('tripTravelers', row._id);
    await TripTravelers.claimInvitation(ctx, 'invite-rsvp', {
      organizationId,
      userId: member.userId,
      viewerName: 'Member'
    });
  });
  await runUntil(trip.owner.test, async () => (await going.wait())?.status === 'met');
  expect(await going.wait()).toMatchObject({ outcome: { snapshot: { going: 2 } } });
});

test('deleting a trip cancels waits on its issues, ideas, and RSVPs', TIMEOUT, async () => {
  const trip = await setupTrip(0);
  const issueId = await createIssue(trip, 'Gone');
  const version = await draftChangedVersion(trip.owner, trip.tripId);
  const issue = await waitRun(trip, { issueId, kind: 'issue', until: 'resolved' });
  const idea = await waitRun(trip, {
    kind: 'proposal',
    proposalId: version.proposalId,
    until: 'approved'
  });
  const rsvp = await waitRun(trip, { kind: 'rsvp', rule: { going: 5 }, tripId: trip.tripId });
  await trip.owner.test.run(async (ctx) => {
    const { deleteTripBatch } = await import('#convex/modules/travel/trips/index');
    for (let batch = 0; batch < 200; batch++) {
      const data = await ctx.db.get('trips', trip.tripId);
      if (!data) return;
      await deleteTripBatch(ctx, data);
    }
    throw new Error('Trip deletion did not finish');
  });
  // Waits resolve before the row goes, so the snapshot keeps its final state.
  expect(await issue.wait()).toMatchObject({
    outcome: {
      reason: 'cancelled',
      snapshot: { status: 'open', title: 'Gone' },
      summary: 'Cancelled: the watched issue was deleted'
    },
    status: 'cancelled'
  });
  expect(await idea.wait()).toMatchObject({
    outcome: {
      snapshot: { status: 'draft' },
      summary: 'Cancelled: the watched proposal was deleted'
    },
    status: 'cancelled'
  });
  expect(await rsvp.wait()).toMatchObject({
    outcome: { snapshot: { going: 1 }, summary: 'Cancelled: the watched rsvp was deleted' },
    status: 'cancelled'
  });
  expect(await evaluate(trip, { issueId, kind: 'issue', until: 'resolved' })).toMatchObject({
    met: false,
    snapshot: { status: 'deleted' },
    summary: 'The issue was deleted'
  });
  expect(
    await evaluate(trip, { kind: 'proposal', proposalId: version.proposalId, until: 'decided' })
  ).toMatchObject({ met: false, snapshot: { status: 'deleted' }, summary: 'The idea was deleted' });
  expect(
    await evaluate(trip, { kind: 'rsvp', rule: { going: 1 }, tripId: trip.tripId })
  ).toMatchObject({ met: false, snapshot: { going: 0 }, summary: 'The trip was deleted' });
  expect(await label(trip, { issueId, kind: 'issue', until: 'resolved' })).toBe('a deleted issue');
  expect(
    await label(trip, { kind: 'proposal', proposalId: version.proposalId, until: 'decided' })
  ).toBe('a deleted idea');
  expect(await label(trip, { kind: 'rsvp', rule: { going: 1 }, tripId: trip.tripId })).toBe(
    'RSVPs on a deleted trip'
  );
});
