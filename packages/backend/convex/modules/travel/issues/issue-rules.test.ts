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

/** Done when days 1 to 3 have at least 2 activities each. */
const twoActivitiesOnDaysOneToThree: IssueRule = {
  items: [
    { comparator: 'at_least', count: 2, days: { from: 1, to: 3 }, kind: 'activities', per: 'day' }
  ],
  match: 'all'
};

type Trip = Awaited<ReturnType<typeof setupReviewedTrip>>;

async function createRuleIssue({ owner, tripId }: Trip, rule = twoActivitiesOnDaysOneToThree) {
  return await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Fill the first three days.',
    rule,
    title: 'Plan the first days',
    tripId
  });
}

const issueOf = async ({ owner }: Trip, issueId: Id<'tripIssues'>) => {
  const issue = await owner.client.query(api.routes.trips.issues.get.run, { issueId });
  if (!issue) throw new Error('Expected the issue');
  return issue;
};

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
        detail: 'Not met on days 1, 2, 3',
        kind: 'clause',
        label: 'Days 1–3 each have at least 2 activities',
        met: false
      }
    ],
    kind: 'rule',
    label: 'Days 1–3 each have at least 2 activities',
    met: false,
    rule: twoActivitiesOnDaysOneToThree
  });
});

test(
  'merged activities close a rule issue, and a later idea that removes them reopens it',
  { timeout: 120_000 },
  async () => {
    const trip = await setupReviewedTrip();
    const issueId = await createRuleIssue(trip);

    await mergeActivities(trip, [1, 1, 2, 3, 3]);
    expect(await issueOf(trip, issueId)).toMatchObject({
      condition: { items: [{ detail: 'Day 2 has 1', met: false }], met: false },
      status: 'open'
    });

    await mergeActivities(trip, [2]);
    const closed = await issueOf(trip, issueId);
    expect(closed).toMatchObject({ closedAt: expect.any(Number), status: 'closed' });
    expect(closed.comments.at(-1)?.content).toBe(
      'Resolved automatically: Days 1–3 each have at least 2 activities'
    );

    await mergeActivities(trip, [4], true);
    expect(await issueOf(trip, issueId)).toMatchObject({ closedAt: null, status: 'open' });
  }
);

test('a rule cannot be hand-closed while unmet but can be discarded', { timeout }, async () => {
  const trip = await setupReviewedTrip();
  const issueId = await createRuleIssue(trip);
  await expect(
    trip.owner.client.mutation(api.routes.trips.issues.move.run, { issueId, status: 'closed' })
  ).rejects.toThrow('This closes itself once the trip meets its rule');
  await trip.owner.client.mutation(api.routes.trips.issues.move.run, {
    issueId,
    status: 'wont_do'
  });
  expect((await issueOf(trip, issueId)).status).toBe('wont_do');
});

test('a rule the trip already meets closes the issue on create', { timeout }, async () => {
  const trip = await setupReviewedTrip();
  const atMostOneDestination: IssueRule = {
    items: [{ comparator: 'at_most', count: 1, kind: 'destinations' }],
    match: 'all'
  };
  const issue = await issueOf(trip, await createRuleIssue(trip, atMostOneDestination));
  expect(issue).toMatchObject({ condition: { met: true }, status: 'closed' });
  // Met and closed, it cannot be reopened by hand.
  await expect(
    trip.owner.client.mutation(api.routes.trips.issues.move.run, {
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
    rule: twoActivitiesOnDaysOneToThree
  });
  expect((await issueOf(trip, issueId)).condition).toMatchObject({ kind: 'rule', met: false });

  await owner.client.mutation(api.routes.trips.issues.condition.run, {
    doneWhen: 'Everyone agrees',
    issueId
  });
  expect((await issueOf(trip, issueId)).condition).toEqual({
    kind: 'manual',
    label: 'Everyone agrees',
    met: null
  });

  await owner.client.mutation(api.routes.trips.issues.condition.run, { issueId });
  const cleared = await issueOf(trip, issueId);
  expect(cleared.condition).toBeNull();
  expect(cleared.comments.map(({ content }) => content)).toEqual([
    expect.stringContaining('set done when: Days 1–3 each have at least 2 activities'),
    expect.stringContaining('set done when: Everyone agrees'),
    expect.stringContaining('removed the done-when condition')
  ]);
});

test('starter decisions and other members cannot change a condition', { timeout }, async () => {
  const trip = await setupReviewedTrip();
  const { owner, reviewer, tripId } = trip;
  const issues = await owner.client.query(api.routes.trips.issues.list.run, { tripId });
  const starter = issues.find((issue) => issue.condition?.kind === 'auto');
  if (!starter) throw new Error('Expected a starter issue');
  await expect(
    owner.client.mutation(api.routes.trips.issues.condition.run, {
      issueId: starter.id,
      rule: twoActivitiesOnDaysOneToThree
    })
  ).rejects.toThrow('Starter decisions are checked automatically');

  const issueId = await createRuleIssue(trip);
  await expect(
    reviewer.client.mutation(api.routes.trips.issues.condition.run, { issueId })
  ).rejects.toThrow('Only organizers or the author');
});

test('a rule and a description together are refused', { timeout }, async () => {
  const { owner, tripId } = await setupReviewedTrip();
  await expect(
    owner.client.mutation(api.routes.trips.issues.create.run, {
      body: 'Both.',
      doneWhen: 'Text',
      rule: twoActivitiesOnDaysOneToThree,
      title: 'Both',
      tripId
    })
  ).rejects.toThrow('not both');
});
