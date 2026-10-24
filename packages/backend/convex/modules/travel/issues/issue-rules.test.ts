import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { IssueRule } from '#convex/modules/travel/issues/rules/index';
import {
  openTripDraft,
  setupReviewedTrip,
  tripActivityInput,
  tripLocationInput
} from '#testing/trips';
import { changedTripDetails, mergeIdea } from '#testing/versions';

const timeout = 30_000;

/** Done when every day of the trip has an activity. */
const activityEveryDay: IssueRule = {
  items: [{ count: 1, kind: 'daily_activities' }],
  match: 'all'
};

type Trip = Awaited<ReturnType<typeof setupReviewedTrip>>;

async function createRuleIssue({ owner, tripId }: Trip, rule = activityEveryDay) {
  return await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Fill every day.',
    rule,
    title: 'Plan every day',
    tripId
  });
}

const issueOf = async ({ owner }: Trip, issueId: Id<'tripIssues'>) => {
  const issue = await owner.client.query(api.routes.trips.issues.get.run, { issueId });
  if (!issue) throw new Error('Expected the issue');
  return issue;
};

/** The issue's rows in `tripIssueConditions`; there is never more than one. */
const conditionRows = async ({ owner }: Trip, issueId: Id<'tripIssues'>) =>
  await owner.client.run(
    async (ctx) =>
      await ctx.db
        .query('tripIssueConditions')
        .withIndex('by_issueId', (query) => query.eq('issueId', issueId))
        .collect()
  );

/** Merges an idea that adds activities on the given days to the trip's one 6-day destination. */
async function mergeActivities(trip: Trip, days: Array<number>, replaceDestination = false) {
  const { owner, reviewer, tripId } = trip;
  const draft = await openTripDraft(owner, tripId);
  const draftId = draft.workingTripId;
  const working = await owner.client.query(api.routes.trips.get.run, { tripId: draftId });
  const existing = working?.destinations[0]?.id;
  // The first idea gives the trip its length; later ones keep it.
  if (!existing) {
    await owner.client.mutation(api.routes.trips.update.run, {
      input: changedTripDetails,
      tripId: draftId
    });
  }
  if (replaceDestination && existing) {
    await owner.client.mutation(api.routes.trips.destinations.remove.run, {
      destinationId: existing,
      tripId: draftId
    });
  }
  const destinationId =
    !replaceDestination && existing
      ? existing
      : await owner.client.mutation(api.routes.trips.destinations.add.run, {
          input: tripLocationInput({ endDay: 6, startDay: 1 }),
          tripId: draftId
        });
  for (const day of days) {
    await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: tripActivityInput({ dayNumber: day, title: `Day ${day} plan` }),
      tripId: draftId
    });
  }
  await mergeIdea(owner, reviewer, draft.proposalId);
}

test('a rule issue shows each clause checked against the shared trip', { timeout }, async () => {
  const trip = await setupReviewedTrip();
  const issue = await issueOf(trip, await createRuleIssue(trip));
  expect(issue.status).toBe('open');
  expect(issue.condition).toMatchObject({
    items: [
      {
        detail: 'No length yet',
        kind: 'clause',
        label: 'Every day has at least 1 activity',
        met: false
      }
    ],
    kind: 'rule',
    label: 'Every day has at least 1 activity',
    met: false,
    rule: activityEveryDay
  });
});

test(
  'merged activities close a rule issue, and a later idea that removes them reopens it',
  { timeout: 120_000 },
  async () => {
    const trip = await setupReviewedTrip();
    const issueId = await createRuleIssue(trip);

    await mergeActivities(trip, [1, 2, 3]);
    expect(await issueOf(trip, issueId)).toMatchObject({
      condition: { items: [{ detail: 'Short on days 4, 5, 6', met: false }], met: false },
      status: 'open'
    });

    await mergeActivities(trip, [4, 5, 6]);
    const closed = await issueOf(trip, issueId);
    expect(closed).toMatchObject({ closedAt: expect.any(Number), status: 'closed' });
    expect(closed.comments.at(-1)?.content).toBe(
      'Resolved automatically: Every day has at least 1 activity'
    );

    await mergeActivities(trip, [4], true);
    expect(await issueOf(trip, issueId)).toMatchObject({ closedAt: null, status: 'open' });
  }
);

test('a rule cannot be hand-closed while unmet but can be discarded', { timeout }, async () => {
  const trip = await setupReviewedTrip();
  const issueId = await createRuleIssue(trip);
  await expect(
    trip.owner.client.mutation(api.routes.trips.issues.status.run, { issueId, status: 'closed' })
  ).rejects.toThrow('This closes itself once every day has at least 1 activity');
  await trip.owner.client.mutation(api.routes.trips.issues.status.run, {
    issueId,
    status: 'wont_do'
  });
  expect((await issueOf(trip, issueId)).status).toBe('wont_do');
});

test('a rule the trip already meets closes the issue on create', { timeout }, async () => {
  const trip = await setupReviewedTrip();
  const noOverlaps: IssueRule = { items: [{ kind: 'no_time_conflicts' }], match: 'all' };
  const issue = await issueOf(trip, await createRuleIssue(trip, noOverlaps));
  expect(issue).toMatchObject({ condition: { met: true }, status: 'closed' });
  // Met and closed, it cannot be reopened by hand.
  await expect(
    trip.owner.client.mutation(api.routes.trips.issues.status.run, {
      issueId: issue.id,
      status: 'open'
    })
  ).rejects.toThrow('Settled automatically');
});

test('setting, replacing, and clearing a condition on an existing issue', { timeout }, async () => {
  const trip = await setupReviewedTrip();
  const { owner, tripId } = trip;
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Decide the pace.',
    title: 'Pace',
    tripId
  });
  await owner.client.mutation(api.routes.trips.issues.condition.run, {
    issueId,
    rule: activityEveryDay
  });
  expect((await issueOf(trip, issueId)).condition).toMatchObject({ kind: 'rule', met: false });
  expect(await conditionRows(trip, issueId)).toEqual([
    expect.objectContaining({ kind: 'rule', rule: activityEveryDay, tripId })
  ]);

  await owner.client.mutation(api.routes.trips.issues.condition.run, {
    doneWhen: 'Everyone agrees',
    issueId
  });
  expect((await issueOf(trip, issueId)).condition).toEqual({
    kind: 'manual',
    label: 'Everyone agrees',
    met: null
  });
  expect(await conditionRows(trip, issueId)).toEqual([
    expect.objectContaining({ kind: 'manual', text: 'Everyone agrees' })
  ]);

  await owner.client.mutation(api.routes.trips.issues.condition.run, { issueId });
  const cleared = await issueOf(trip, issueId);
  expect(cleared.condition).toBeNull();
  expect(await conditionRows(trip, issueId)).toEqual([]);
  expect(cleared.comments.map(({ content }) => content)).toEqual([
    expect.stringContaining('set done when: Every day has at least 1 activity'),
    expect.stringContaining('set done when: Everyone agrees'),
    expect.stringContaining('removed the done-when condition')
  ]);
});

test("editing a starter decision makes it the person's own rule", { timeout }, async () => {
  const trip = await setupReviewedTrip();
  const { owner, tripId } = trip;
  const issues = await owner.client.query(api.routes.trips.issues.list.run, { tripId });
  const starter = issues.find(({ condition }) => condition?.kind === 'rule' && condition.starter);
  if (!starter) throw new Error('Expected a starter issue');
  await owner.client.mutation(api.routes.trips.issues.condition.run, {
    issueId: starter.id,
    rule: activityEveryDay
  });
  const edited = await issueOf(trip, starter.id);
  expect(edited.condition).toMatchObject({ kind: 'rule', rule: activityEveryDay, starter: false });
  expect(edited.comments.map(({ content }) => content)).toContainEqual(
    expect.stringContaining('set done when: Every day has at least 1 activity')
  );
});

test('other members cannot change a condition', { timeout }, async () => {
  const trip = await setupReviewedTrip();
  const issueId = await createRuleIssue(trip);
  await expect(
    trip.reviewer.client.mutation(api.routes.trips.issues.condition.run, { issueId })
  ).rejects.toThrow('Only organizers or the author');
});

test('a rule and a description together are refused', { timeout }, async () => {
  const { owner, tripId } = await setupReviewedTrip();
  await expect(
    owner.client.mutation(api.routes.trips.issues.create.run, {
      body: 'Both.',
      doneWhen: 'Text',
      rule: activityEveryDay,
      title: 'Both',
      tripId
    })
  ).rejects.toThrow('not both');
});
