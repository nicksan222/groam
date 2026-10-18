import { expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { agentWorkflow } from '#convex/modules/assistant/engine/manager';
import { createOutsiderClient } from '#testing/factory';
import { createTripPoll, insertAgentRun } from '#testing/polls';
import { setupTrip, tripInput } from '#testing/trips';
import { draftChangedVersion } from '#testing/versions';
import { createIssue, removeMember, inFakeTime, submitIdea, waitHelpers } from '#testing/waits';
import { runUntil } from '#testing/workflows';

vi.useRealTimers();

// oxlint-disable-next-line jest/no-export -- convex-test discovers test-only functions through module exports.
export const idle = agentWorkflow.define({ args: {} }).handler(async (step): Promise<void> => {
  // Runs in this file park here so wait events have a live workflow to target.
  await step.awaitEvent({ name: 'never' });
});

const IDLE = 'modules/assistant/waits/roster-waits.test:idle';
const { refusal, run: waitRun } = waitHelpers(IDLE);
const TIMEOUT = { timeout: 30_000 };

test('a member joining meets a going-count wait', TIMEOUT, async () => {
  await inFakeTime(async (settle) => {
    const trip = await setupTrip(1);
    const going = await waitRun(trip, { kind: 'rsvp', rule: { going: 3 }, tripId: trip.tripId });
    await settle(trip);
    expect((await going.wait())?.status).toBe('waiting');
    await trip.addUser('Third traveler');
    await settle(trip);
    expect(await going.wait()).toMatchObject({
      outcome: { progress: '3 of 3 going', reason: 'met' },
      status: 'met'
    });
  });
});

test('a member leaving re-checks trip and group poll waits', TIMEOUT, async () => {
  await inFakeTime(async (settle) => {
    const trip = await setupTrip(1);
    const [member] = trip.users;
    if (!member) throw new Error('Expected a member');
    const tripPoll = await createTripPoll(trip.owner, trip.tripId);
    const groupPoll = await trip.owner.client.mutation(api.routes.polls.create.run, {
      multiSelect: false,
      options: ['Yes', 'No'],
      question: 'Group dinner?'
    });
    const allVoted = [{ kind: 'allVoted' as const }];
    const onTrip = await waitRun(trip, { kind: 'poll', pollId: tripPoll, rule: allVoted });
    const inGroup = await waitRun(
      trip,
      { kind: 'poll', pollId: groupPoll, rule: allVoted },
      { tripId: null }
    );
    for (const pollId of [tripPoll, groupPoll]) {
      await trip.owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
    }
    expect((await onTrip.wait())?.status).toBe('waiting');
    expect((await inGroup.wait())?.status).toBe('waiting');
    await settle(trip);
    await removeMember(trip, member.userId);
    await settle(trip);
    expect(await onTrip.wait()).toMatchObject({
      outcome: { progress: '1 of 1 voted' },
      status: 'met'
    });
    expect(await inGroup.wait()).toMatchObject({
      outcome: { progress: '1 of 1 voted' },
      status: 'met'
    });
  });
});

test(
  'an RSVP stays cheap with many open polls; their waits resolve after it',
  TIMEOUT,
  async () => {
    const trip = await setupTrip(1);
    const [member] = trip.users;
    if (!member) throw new Error('Expected a member');
    const pollIds: Array<Id<'polls'>> = [];
    for (let index = 0; index < 21; index++) {
      pollIds.push(
        await createTripPoll(trip.owner, trip.tripId, { question: `Question ${index}?` })
      );
    }
    const watched = [pollIds[0], pollIds[1], pollIds[20]].filter(
      (id): id is Id<'polls'> => id !== undefined
    );
    const runs: Array<Awaited<ReturnType<typeof waitRun>>> = [];
    for (const pollId of watched) {
      await trip.owner.client.mutation(api.routes.polls.vote.run, { optionIds: ['o1'], pollId });
      // Two waits on one poll share a single tally read per signal.
      for (const rule of [
        [{ kind: 'allVoted' as const }],
        [{ count: 1, kind: 'quorum' as const }]
      ]) {
        runs.push(await waitRun(trip, { kind: 'poll', pollId, rule }));
      }
    }
    const statuses = async () => Promise.all(runs.map(async (run) => (await run.wait())?.status));
    expect(await statuses()).toEqual(['waiting', 'met', 'waiting', 'met', 'waiting', 'met']);
    await expect(
      member.client.mutation(api.routes.trips.travelers.set.run, {
        status: 'not_going',
        tripId: trip.tripId
      })
    ).resolves.toBeNull();
    await runUntil(trip.owner.test, async () => (await statuses()).every((s) => s === 'met'));
    expect(await runs[0]?.wait()).toMatchObject({ outcome: { progress: '1 of 1 voted' } });
  }
);

test('approvals from a reviewer who left the group do not count', TIMEOUT, async () => {
  // Fake time keeps the departure's scheduled re-checks (and the stopped review) from running;
  // the condition reads the live roster, so nothing needs to settle.
  await inFakeTime(async () => {
    const trip = await setupTrip(2);
    const [reviewer] = trip.users;
    if (!reviewer) throw new Error('Expected a reviewer');
    const { proposalId } = await draftChangedVersion(trip.owner, trip.tripId);
    await submitIdea(trip, proposalId);
    await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
      approved: true,
      proposalId
    });
    await removeMember(trip, reviewer.userId);
    const approved = await waitRun(trip, { kind: 'proposal', proposalId, until: 'approved' });
    expect((await approved.wait())?.status).toBe('waiting');
    const view = await trip.owner.test.run(async (ctx) => {
      const { AgentWaits } = await import('#convex/modules/assistant/waits/index');
      const wait = await ctx.db.get('agentWaits', approved.waitId);
      return wait ? await AgentWaits.present(ctx, wait) : null;
    });
    expect(view?.progress).toBe('0 of 1 approvals');
  });
});

test(
  'waits on issues, ideas, and RSVPs are refused outside what the run can read',
  TIMEOUT,
  async () => {
    const trip = await setupTrip(1);
    // Another group in the same deployment.
    const outsider = await createOutsiderClient(trip.owner.test);
    const otherTripId = await outsider.client.action(api.routes.trips.create.run, {
      input: tripInput()
    });
    const foreignIssue = await outsider.client.mutation(api.routes.trips.issues.create.run, {
      body: 'b',
      title: 'Elsewhere',
      tripId: otherTripId
    });
    const foreignIdea = await draftChangedVersion(
      outsider as typeof trip.owner,
      otherTripId as Id<'trips'>
    );
    expect(await refusal(trip, { issueId: foreignIssue, kind: 'issue', until: 'resolved' })).toBe(
      'Issue not found'
    );
    expect(
      await refusal(trip, {
        kind: 'proposal',
        proposalId: foreignIdea.proposalId,
        until: 'approved'
      })
    ).toBe('Idea not found');
    expect(await refusal(trip, { kind: 'rsvp', rule: { going: 1 }, tripId: otherTripId })).toBe(
      'Trip not found'
    );

    // The outsider's own run cannot watch an idea on this trip (which has no issue).
    const idea = await draftChangedVersion(trip.owner, trip.tripId);
    const outsiderOrganization = (await outsider.authClient.getSession()).data?.session
      .activeOrganizationId;
    if (!outsiderOrganization) throw new Error('Expected the outsider organization');
    expect(
      await refusal(
        trip,
        { kind: 'proposal', proposalId: idea.proposalId, until: 'decided' },
        {
          createdBy: { name: 'Outsider', userId: outsider.userId },
          organizationId: outsiderOrganization,
          tripId: null
        }
      )
    ).toBe('Idea not found');

    const secondTrip = await trip.owner.client.action(api.routes.trips.create.run, {
      input: tripInput()
    });
    const issueThere = await trip.owner.client.mutation(api.routes.trips.issues.create.run, {
      body: 'b',
      title: 'There',
      tripId: secondTrip
    });
    const ideaThere = await draftChangedVersion(trip.owner, secondTrip);
    expect(await refusal(trip, { issueId: issueThere, kind: 'issue', until: 'resolved' })).toBe(
      'That issue belongs to another trip'
    );
    expect(
      await refusal(trip, { kind: 'proposal', proposalId: ideaThere.proposalId, until: 'decided' })
    ).toBe('That idea belongs to another trip');
    expect(await refusal(trip, { kind: 'rsvp', rule: { going: 1 }, tripId: secondTrip })).toBe(
      'That trip is not this run’s trip'
    );
    expect(
      await refusal(
        trip,
        { kind: 'rsvp', rule: { going: 1 }, tripId: idea.workingTripId },
        { tripId: null }
      )
    ).toBe('RSVPs live on the shared trip, not on an idea');
    expect(await refusal(trip, { kind: 'rsvp', rule: { going: 0 }, tripId: trip.tripId })).toBe(
      'A going count must be a whole number of at least 1'
    );

    // A run started by someone who has since left the group can watch nothing.
    const issueId = await createIssue(trip, 'Mine');
    const runId = await insertAgentRun(
      trip,
      { createdBy: { name: 'Gone', userId: 'departed-user' } },
      IDLE
    );
    await expect(
      trip.owner.test.run(async (ctx) => {
        const { AgentWaits } = await import('#convex/modules/assistant/waits/index');
        return await AgentWaits.create(ctx, {
          condition: { issueId, kind: 'issue', until: 'resolved' },
          deadlineAt: Date.now() + 60_000,
          runId
        });
      })
    ).rejects.toThrow('The person who started this run left the group');
  }
);
