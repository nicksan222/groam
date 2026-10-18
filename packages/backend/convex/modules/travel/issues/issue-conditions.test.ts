import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ClauseKind } from '#convex/modules/travel/issues/rules/index';
import { STARTER_ISSUES } from '#convex/modules/travel/issues/starters';
import { openTripDraft, setupReviewedTrip, tripLocationInput } from '#testing/trips';
import { applyIdea, changedTripDetails, mergeIdea } from '#testing/versions';

const timeout = 30_000;

async function setup() {
  const trip = await setupReviewedTrip();
  const issues = await trip.owner.client.query(api.routes.trips.issues.list.run, {
    tripId: trip.tripId
  });
  /** The starter issue whose one-clause rule is `kind`. */
  const byCheck = (kind: ClauseKind) => {
    const issue = issues.find(
      ({ condition }) =>
        condition?.kind === 'rule' && condition.starter && condition.rule.items[0]?.kind === kind
    );
    if (!issue) throw new Error(`Expected a ${kind} issue`);
    return issue;
  };
  return { ...trip, byCheck };
}

type Owner = Awaited<ReturnType<typeof setup>>['owner'];

const listIssues = (owner: Owner, tripId: Id<'trips'>) =>
  owner.client.query(api.routes.trips.issues.list.run, { tripId });

const statusOf = async (owner: Owner, tripId: Id<'trips'>, issueId: Id<'tripIssues'>) =>
  (await listIssues(owner, tripId)).find((issue) => issue.id === issueId);

const withDates = { ...changedTripDetails, startDate: '2027-06-01' };

test.each(STARTER_ISSUES)('the $title starter reports its rule unmet', async (starter) => {
  const { owner, tripId } = await setup();
  const issues = await listIssues(owner, tripId);

  expect(issues.find((issue) => issue.title === starter.title)?.condition).toMatchObject({
    kind: 'rule',
    met: false,
    rule: starter.rule,
    starter: true
  });
});

test('a starter rule cannot be closed or discarded by hand', { timeout }, async () => {
  const { byCheck, owner, tripId } = await setup();
  const { id } = byCheck('has_dates');
  for (const status of ['closed', 'wont_do'] as const) {
    await expect(
      owner.client.mutation(api.routes.trips.issues.status.run, { issueId: id, status })
    ).rejects.toThrow(
      'This closes itself once the trip has travel dates. Start an idea that gets it there.'
    );
    await expect(
      owner.client.mutation(api.routes.trips.issues.move.run, { issueId: id, status })
    ).rejects.toThrow('This closes itself once');
  }
  // In progress, back to open, and reordering stay allowed.
  for (const status of ['in_progress', 'open'] as const) {
    await owner.client.mutation(api.routes.trips.issues.move.run, { issueId: id, status });
  }
  await owner.client.mutation(api.routes.trips.issues.move.run, { issueId: id, status: 'open' });
  expect((await statusOf(owner, tripId, id))?.status).toBe('open');
});

test('a manual done-when condition closes by hand', { timeout }, async () => {
  const { owner, tripId } = await setup();
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Pick a restaurant.',
    doneWhen: '  Everyone agrees on a restaurant  ',
    title: 'Dinner',
    tripId
  });
  expect((await statusOf(owner, tripId, issueId))?.condition).toEqual({
    kind: 'manual',
    label: 'Everyone agrees on a restaurant',
    met: null
  });
  await owner.client.mutation(api.routes.trips.issues.status.run, { issueId, status: 'closed' });
  expect((await statusOf(owner, tripId, issueId))?.status).toBe('closed');
  await expect(
    owner.client.mutation(api.routes.trips.issues.create.run, {
      body: 'x',
      doneWhen: '   ',
      title: 'Bad',
      tripId
    })
  ).rejects.toThrow('Done-when condition');
  const plain = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'No condition.',
    title: 'Plain',
    tripId
  });
  expect((await statusOf(owner, tripId, plain))?.condition).toBeNull();
});

test(
  'closes an issue when a merged idea settles it and reopens it when a later one undoes it',
  { timeout: 60_000 },
  async () => {
    const { byCheck, owner, reviewer, tripId } = await setup();
    const dates = byCheck('has_dates');

    await applyIdea(owner, reviewer, tripId, withDates);
    const closed = await listIssues(owner, tripId);
    expect(closed.find((issue) => issue.id === dates.id)).toMatchObject({
      closedAt: expect.any(Number),
      condition: { met: true },
      status: 'closed'
    });
    // Destination and duration were set by the same idea; stays were not.
    expect(closed.find((issue) => issue.id === byCheck('has_destination').id)?.status).toBe(
      'closed'
    );
    expect(closed.find((issue) => issue.id === byCheck('has_length').id)?.status).toBe('closed');
    expect(closed.find((issue) => issue.id === byCheck('nights_covered').id)?.status).toBe('open');
    const detail = await owner.client.query(api.routes.trips.issues.get.run, {
      issueId: dates.id
    });
    expect(detail?.comments.map((comment) => comment.content)).toEqual([
      'Resolved automatically: The trip has travel dates'
    ]);

    await applyIdea(owner, reviewer, tripId, changedTripDetails);
    expect(await statusOf(owner, tripId, dates.id)).toMatchObject({
      closedAt: null,
      condition: { met: false },
      status: 'open'
    });
    const after = await owner.client.query(api.routes.trips.issues.get.run, {
      issueId: dates.id
    });
    expect(after?.comments.at(-1)?.content).toBe(
      'Reopened automatically: The trip has travel dates no longer holds'
    );
  }
);

test('idea working copies never trigger the sync', { timeout }, async () => {
  const { byCheck, owner, tripId } = await setup();
  const version = await openTripDraft(owner, tripId);
  await owner.client.mutation(api.routes.trips.update.run, {
    input: withDates,
    tripId: version.workingTripId
  });
  expect(await statusOf(owner, tripId, byCheck('has_dates').id)).toMatchObject({
    condition: { met: false },
    status: 'open'
  });
});

test(
  'an issue that an idea closes keeps an unmet checked condition open',
  { timeout: 60_000 },
  async () => {
    const { byCheck, owner, reviewer, tripId } = await setup();
    const stays = byCheck('nights_covered');
    const version = await openTripDraft(owner, tripId, { issueId: stays.id });
    await owner.client.mutation(api.routes.trips.update.run, {
      input: changedTripDetails,
      tripId: version.workingTripId
    });
    await mergeIdea(owner, reviewer, version.proposalId);
    expect((await statusOf(owner, tripId, stays.id))?.status).toBe('open');
  }
);

test(
  'the stays issue follows merged stays: closed when they cover every night, reopened when they shrink',
  { timeout: 90_000 },
  async () => {
    const { byCheck, owner, reviewer, tripId } = await setup();
    const stays = byCheck('nights_covered');
    const firstDraft = await openTripDraft(owner, tripId);
    const draftId = firstDraft.workingTripId;
    await owner.client.mutation(api.routes.trips.update.run, {
      input: changedTripDetails,
      tripId: draftId
    });
    const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput({ endDay: 6, startDay: 1 }),
      tripId: draftId
    });
    await owner.client.mutation(api.routes.trips.destinations.stays.add.run, {
      destinationId,
      input: { schedule: { checkInDay: 1, checkOutDay: 4 }, title: 'First hotel' },
      tripId: draftId
    });
    await mergeIdea(owner, reviewer, firstDraft.proposalId);
    // Nights 4 and 5 are still uncovered.
    expect(await statusOf(owner, tripId, stays.id)).toMatchObject({
      condition: { met: false },
      status: 'open'
    });

    const secondDraft = await openTripDraft(owner, tripId);
    const [copiedDestination] = (
      await owner.client.query(api.routes.trips.get.run, { tripId: secondDraft.workingTripId })
    ).destinations;
    if (!copiedDestination) throw new Error('Expected the destination in the idea copy');
    await owner.client.mutation(api.routes.trips.destinations.stays.add.run, {
      destinationId: copiedDestination.id,
      input: { schedule: { checkInDay: 4, checkOutDay: 6 }, title: 'Second hotel' },
      tripId: secondDraft.workingTripId
    });
    await mergeIdea(owner, reviewer, secondDraft.proposalId);
    expect(await statusOf(owner, tripId, stays.id)).toMatchObject({
      condition: { met: true },
      status: 'closed'
    });

    const thirdDraft = await openTripDraft(owner, tripId);
    const { destinations } = await owner.client.query(api.routes.trips.get.run, {
      tripId: thirdDraft.workingTripId
    });
    const shortened = destinations[0]?.stays.at(-1);
    if (!shortened) throw new Error('Expected a stay in the idea copy');
    await owner.client.mutation(api.routes.trips.destinations.stays.remove.run, {
      stayId: shortened.id,
      tripId: thirdDraft.workingTripId
    });
    await mergeIdea(owner, reviewer, thirdDraft.proposalId);
    expect(await statusOf(owner, tripId, stays.id)).toMatchObject({
      closedAt: null,
      condition: { met: false },
      status: 'open'
    });
  }
);

test(
  'a settled auto issue cannot be reopened by hand, an unmet one can be started',
  { timeout: 60_000 },
  async () => {
    const { byCheck, owner, reviewer, tripId } = await setup();
    const dates = byCheck('has_dates');
    const duration = byCheck('has_length');
    await applyIdea(owner, reviewer, tripId, withDates);
    for (const status of ['open', 'in_progress', 'wont_do'] as const) {
      await expect(
        owner.client.mutation(api.routes.trips.issues.status.run, { issueId: dates.id, status })
      ).rejects.toThrow('Settled automatically: The trip has travel dates.');
    }
    await expect(
      owner.client.mutation(api.routes.trips.issues.move.run, { issueId: dates.id, status: 'open' })
    ).rejects.toThrow('Change the trip through an idea to reopen it.');
    const reorder = () =>
      owner.client.mutation(api.routes.trips.issues.move.run, {
        afterIssueId: duration.id,
        issueId: dates.id,
        status: 'closed'
      });
    // Reordering inside the closed lane stays allowed.
    await reorder();
    // Once the condition breaks the issue reopens itself, can be reordered, and started by hand.
    await applyIdea(owner, reviewer, tripId, changedTripDetails);
    await owner.client.mutation(api.routes.trips.issues.move.run, {
      issueId: dates.id,
      status: 'open'
    });
    await owner.client.mutation(api.routes.trips.issues.status.run, {
      issueId: dates.id,
      status: 'in_progress'
    });
    expect((await statusOf(owner, tripId, dates.id))?.status).toBe('in_progress');
  }
);
