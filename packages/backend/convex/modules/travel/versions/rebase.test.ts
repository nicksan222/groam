import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { setupTrip, tripLocationInput } from '#testing/trips';
import { changedTripDetails, draftChangedVersion } from '#testing/versions';

async function reviewReadyIdea() {
  const { owner, tripId, users } = await setupTrip(1);
  const reviewer = users[0];
  if (!reviewer) throw new Error('Expected a reviewer');
  const version = await draftChangedVersion(owner, tripId);
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });
  return { owner, reviewer, tripId, version };
}

async function moveSharedTripName(
  owner: Awaited<ReturnType<typeof setupTrip>>['owner'],
  tripId: Awaited<ReturnType<typeof setupTrip>>['tripId'],
  name: string
) {
  await owner.client.run(async (ctx) => {
    const trip = await ctx.db.get('trips', tripId);
    if (!trip) throw new Error('Expected source trip');
    await ctx.db.patch('trips', tripId, { name, updatedAt: trip.updatedAt + 1 });
  });
}

test('fast-forwards a rebase when the shared trip only added a compatible change', {
  timeout: 15_000
}, async () => {
  const { owner, tripId, version } = await reviewReadyIdea();
  const place = tripLocationInput({ name: 'Porto, Portugal', placeId: 'porto-rebase' });
  await owner.client.run(async (ctx) => {
    const trip = await ctx.db.get('trips', tripId);
    if (!trip) throw new Error('Expected source trip');
    await ctx.db.insert('tripDestinations', {
      coordinates: place.coordinates,
      countryCode: place.countryCode,
      name: place.name,
      placeId: place.placeId,
      position: 0,
      tripId
    });
    await ctx.db.patch('trips', tripId, { updatedAt: trip.updatedAt + 1 });
  });

  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ canRebase: true, sourceChanged: true, status: 'in_review' });

  await expect(
    owner.client.action(api.routes.trips.versions.rebase.run, {
      proposalId: version.proposalId,
      resolutions: []
    })
  ).resolves.toEqual({ kind: 'applied' });

  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    canRebase: false,
    conflicts: [],
    sourceChanged: false,
    status: 'in_review'
  });
  await expect(
    owner.client.query(api.routes.trips.find.run, { tripId: version.workingTripId })
  ).resolves.toMatchObject({
    destinations: [expect.objectContaining({ name: 'Porto, Portugal' })],
    name: 'Lisbon proposal'
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    name: 'Summer beach idea'
  });

  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, { proposalId: version.proposalId })
  ).resolves.toBe('applied');
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [expect.objectContaining({ name: 'Porto, Portugal' })],
    name: 'Lisbon proposal'
  });
});

test('returns remaining conflicts for the wizard, then rebases chosen sides without merging', {
  timeout: 15_000
}, async () => {
  const { owner, tripId, version } = await reviewReadyIdea();
  await moveSharedTripName(owner, tripId, 'Competing shared name');

  await expect(
    owner.client.action(api.routes.trips.versions.rebase.run, {
      proposalId: version.proposalId,
      resolutions: []
    })
  ).resolves.toMatchObject({
    conflicts: [expect.objectContaining({ key: 'trip.json', label: 'Lisbon proposal' })],
    kind: 'needs_choices'
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ sourceChanged: true, status: 'in_review' });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    name: 'Competing shared name'
  });

  await expect(
    owner.client.action(api.routes.trips.versions.rebase.run, {
      proposalId: version.proposalId,
      resolutions: [{ choice: 'proposed', path: 'trip.json' }]
    })
  ).resolves.toEqual({ kind: 'applied' });

  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    canRebase: false,
    conflicts: [],
    sourceChanged: false,
    status: 'in_review'
  });
  await expect(
    owner.client.query(api.routes.trips.find.run, { tripId: version.workingTripId })
  ).resolves.toMatchObject({ name: 'Lisbon proposal' });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    name: 'Competing shared name'
  });
});

test('rebases a conflicted idea and keeps shared when that side is chosen', {
  timeout: 15_000
}, async () => {
  const { owner, tripId, version } = await reviewReadyIdea();
  await moveSharedTripName(owner, tripId, 'Competing shared name');
  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, { proposalId: version.proposalId })
  ).resolves.toBe('conflicted');
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ canRebase: true, canResolve: true, status: 'conflicted' });
  await owner.client.mutation(api.routes.trips.update.run, {
    input: { ...changedTripDetails, name: 'Refined after conflict' },
    tripId: version.workingTripId
  });
  await expect(
    owner.client.query(api.routes.trips.find.run, { tripId: version.workingTripId })
  ).resolves.toMatchObject({
    name: 'Refined after conflict',
    permissions: { canEdit: true, isReadOnly: false }
  });

  await expect(
    owner.client.action(api.routes.trips.versions.rebase.run, {
      proposalId: version.proposalId,
      resolutions: [{ choice: 'current', path: 'trip.json' }]
    })
  ).resolves.toEqual({ kind: 'applied' });

  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ conflicts: [], status: 'in_review' });
  await expect(
    owner.client.query(api.routes.trips.find.run, { tripId: version.workingTripId })
  ).resolves.toMatchObject({ name: 'Competing shared name' });
});

test('lets the idea author rebase while reviews and conversations are still open', {
  timeout: 15_000
}, async () => {
  const { owner, tripId } = await setupTrip(1);
  const version = await draftChangedVersion(owner, tripId);
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await owner.client.mutation(api.routes.trips.versions.feedback.add.run, {
    content: 'Please keep the coast day if the shared trip moved.',
    kind: 'change_request',
    proposalId: version.proposalId
  });
  await moveSharedTripName(owner, tripId, 'Another shared name');

  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    canMerge: false,
    canRebase: true,
    sourceChanged: true,
    unresolvedFeedbackCount: 1
  });
  await expect(
    owner.client.action(api.routes.trips.versions.rebase.run, {
      proposalId: version.proposalId,
      resolutions: [{ choice: 'proposed', path: 'trip.json' }]
    })
  ).resolves.toEqual({ kind: 'applied' });
  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, { proposalId: version.proposalId })
  ).rejects.toThrow('Resolve all idea feedback before applying');
});

test('keeps merge gated on required approvals after a rebase', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupTrip(1);
  const version = await draftChangedVersion(owner, tripId);
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await moveSharedTripName(owner, tripId, 'Another shared name');

  await expect(
    owner.client.action(api.routes.trips.versions.rebase.run, {
      proposalId: version.proposalId,
      resolutions: [{ choice: 'proposed', path: 'trip.json' }]
    })
  ).resolves.toEqual({ kind: 'applied' });
  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, { proposalId: version.proposalId })
  ).rejects.toThrow('needs 1 approval');
});

test('lets an organizer rebase another member idea and refuses other participants', {
  timeout: 15_000
}, async () => {
  const { owner, tripId, users } = await setupTrip(2);
  const [author, participant] = users;
  if (!(author && participant)) throw new Error('Expected group members');
  const version = await author.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await author.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });
  await author.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await owner.client.mutation(api.routes.trips.versions.feedback.add.run, {
    content: 'Unresolved conversation should not block rebase.',
    proposalId: version.proposalId
  });
  await moveSharedTripName(owner, tripId, 'Competing shared name');

  await expect(
    author.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ canMerge: false, canRebase: true });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ canMerge: false, canRebase: true });
  await expect(
    participant.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ canRebase: false });
  await expect(
    participant.client.action(api.routes.trips.versions.rebase.run, {
      proposalId: version.proposalId,
      resolutions: []
    })
  ).rejects.toThrow('Only the idea author or a group admin can rebase');

  await expect(
    owner.client.action(api.routes.trips.versions.rebase.run, {
      proposalId: version.proposalId,
      resolutions: [{ choice: 'proposed', path: 'trip.json' }]
    })
  ).resolves.toEqual({ kind: 'applied' });
  await expect(
    author.client.query(api.routes.trips.find.run, { tripId: version.workingTripId })
  ).resolves.toMatchObject({ name: 'Lisbon proposal' });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    name: 'Competing shared name'
  });
});

test('refuses rebase after the idea is merged', { timeout: 15_000 }, async () => {
  const { owner, tripId, version } = await reviewReadyIdea();
  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, { proposalId: version.proposalId })
  ).resolves.toBe('applied');
  await moveSharedTripName(owner, tripId, 'Later shared name');

  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ canRebase: false, status: 'merged' });
  await expect(
    owner.client.action(api.routes.trips.versions.rebase.run, {
      proposalId: version.proposalId,
      resolutions: []
    })
  ).rejects.toThrow('Closed or merged ideas cannot be rebased');
});

test('rebases mixed detail choices atomically and clears the conflict history', {
  timeout: 15_000
}, async () => {
  const { owner, tripId, version } = await reviewReadyIdea();
  await owner.client.run(async (ctx) => {
    const trip = await ctx.db.get('trips', tripId);
    if (!trip) throw new Error('Expected shared trip');
    await ctx.db.patch('trips', tripId, {
      name: 'Shared name',
      dateNotes: 'Shared dates',
      currency: 'USD',
      updatedAt: trip.updatedAt + 1
    });
  });
  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, { proposalId: version.proposalId })
  ).resolves.toBe('conflicted');
  const shared = await owner.client.query(api.routes.trips.find.run, { tripId });
  const idea = await owner.client.query(api.routes.trips.find.run, {
    tripId: version.workingTripId
  });
  if (!shared || !idea) throw new Error('Expected both copies');
  await expect(
    owner.client.action(api.routes.trips.versions.rebase.run, {
      proposalId: version.proposalId,
      resolutions: [],
      details: {
        expectedSharedUpdatedAt: shared.lastUpdatedAt,
        expectedWorkingUpdatedAt: idea.lastUpdatedAt,
        choices: [
          { key: 'name', choice: 'shared' },
          { key: 'dateNotes', choice: 'mine' }
        ]
      }
    })
  ).resolves.toEqual({ kind: 'applied' });
  await expect(
    owner.client.query(api.routes.trips.find.run, { tripId: version.workingTripId })
  ).resolves.toMatchObject({
    name: 'Shared name',
    dateNotes: changedTripDetails.dateNotes,
    currency: 'USD'
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    conflicts: [],
    sourceChanged: false,
    status: 'in_review'
  });
  await expect(owner.client.query(api.routes.trips.find.run, { tripId })).resolves.toMatchObject({
    name: 'Shared name',
    dateNotes: 'Shared dates'
  });
});

test('rejects stale mixed detail choices before updating either copy', {
  timeout: 15_000
}, async () => {
  const { owner, tripId, version } = await reviewReadyIdea();
  const shared = await owner.client.query(api.routes.trips.find.run, { tripId });
  const idea = await owner.client.query(api.routes.trips.find.run, {
    tripId: version.workingTripId
  });
  if (!shared || !idea) throw new Error('Expected both copies');
  await moveSharedTripName(owner, tripId, 'Newer shared name');
  await expect(
    owner.client.action(api.routes.trips.versions.rebase.run, {
      proposalId: version.proposalId,
      resolutions: [],
      details: {
        expectedSharedUpdatedAt: shared.lastUpdatedAt,
        expectedWorkingUpdatedAt: idea.lastUpdatedAt,
        choices: [{ key: 'name', choice: 'shared' }]
      }
    })
  ).rejects.toThrow('The trip changed while you were reviewing');
  await expect(
    owner.client.query(api.routes.trips.find.run, { tripId: version.workingTripId })
  ).resolves.toMatchObject({ name: idea.name });
});
