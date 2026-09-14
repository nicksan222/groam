import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import { setupTrip, tripLocationInput } from '#testing/trips';
import { changedTripDetails, createTitledVersion, draftChangedVersion } from '#testing/versions';

test('schedules title generation after draft edits', { timeout: 10_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);

  await owner.client.run(async (ctx) => {
    const proposal = await ctx.db.get('tripProposals', version.proposalId);
    expect(proposal?.titleGeneration).toBe(1);
  });
});

test('returns change context for draft ideas with edits', { timeout: 10_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);

  await expect(
    owner.client.query(internal.modules.travel.versions.agent.title.index.context, {
      generation: 1,
      proposalId: version.proposalId
    })
  ).resolves.toMatchObject({
    issueTitle: null,
    title: expect.stringMatching(/trip idea$/u),
    changes: expect.arrayContaining([
      expect.objectContaining({ entity: 'details', change: 'modified' })
    ])
  });
});

test('returns null context when the scheduled generation is stale', {
  timeout: 10_000
}, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);

  await expect(
    owner.client.query(internal.modules.travel.versions.agent.title.index.context, {
      generation: 0,
      proposalId: version.proposalId
    })
  ).resolves.toBeNull();
});

test('returns null context when the draft has no changes yet', { timeout: 10_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });

  await expect(
    owner.client.query(internal.modules.travel.versions.agent.title.index.context, {
      generation: 1,
      proposalId: version.proposalId
    })
  ).resolves.toBeNull();
});

test('ignores stale title generation writes', { timeout: 10_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);

  await owner.client.mutation(internal.modules.travel.versions.agent.title.index.finish, {
    generation: 0,
    proposalId: version.proposalId,
    title: 'Should not apply'
  });

  await expect(
    owner.client.query(api.routes.trips.versions.list.run, { tripId })
  ).resolves.toMatchObject([{ title: expect.stringMatching(/trip idea$/u) }]);
});

test('ignores invalid generated titles', { timeout: 10_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);

  await owner.client.mutation(internal.modules.travel.versions.agent.title.index.finish, {
    generation: 1,
    proposalId: version.proposalId,
    title: '   '
  });

  await expect(
    owner.client.query(api.routes.trips.versions.list.run, { tripId })
  ).resolves.toMatchObject([{ title: expect.stringMatching(/trip idea$/u) }]);
});

test('stores issue title source when implementing an issue', { timeout: 10_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Book direct flights for the group',
    title: 'Book flights',
    tripId
  });
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, {
    issueId,
    tripId
  });

  await owner.client.run(async (ctx) => {
    const proposal = await ctx.db.get('tripProposals', version.proposalId);
    expect(proposal).toMatchObject({
      issueId,
      title: 'Implement: Book flights',
      titleSource: 'issue'
    });
  });
});

test('does not schedule title generation for user-titled drafts without edits', {
  timeout: 10_000
}, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await createTitledVersion(owner, tripId, 'Add a coastal day trip');

  await owner.client.run(async (ctx) => {
    const proposal = await ctx.db.get('tripProposals', version.proposalId);
    expect(proposal?.titleGeneration).toBeUndefined();
  });
});

test('does not schedule title generation for user-titled drafts after edits', {
  timeout: 10_000
}, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await createTitledVersion(owner, tripId, 'Add a coastal day trip');
  await owner.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });

  await owner.client.run(async (ctx) => {
    const proposal = await ctx.db.get('tripProposals', version.proposalId);
    expect(proposal?.titleGeneration).toBeUndefined();
  });
});

test('increments title generation on subsequent draft edits', { timeout: 10_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);

  await owner.client.mutation(api.routes.trips.update.run, {
    input: { ...changedTripDetails, dateNotes: 'November break' },
    tripId: version.workingTripId
  });

  await owner.client.run(async (ctx) => {
    const proposal = await ctx.db.get('tripProposals', version.proposalId);
    expect(proposal?.titleGeneration).toBe(2);
  });
});

test('ignores generated titles that match the current title', { timeout: 10_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);

  const currentTitle = await owner.client.run(async (ctx) => {
    const proposal = await ctx.db.get('tripProposals', version.proposalId);
    expect(proposal?.title).toMatch(/trip idea$/u);
    return proposal?.title ?? '';
  });

  await owner.client.mutation(internal.modules.travel.versions.agent.title.index.finish, {
    generation: 1,
    proposalId: version.proposalId,
    title: currentTitle
  });

  await owner.client.run(async (ctx) => {
    const proposal = await ctx.db.get('tripProposals', version.proposalId);
    expect(proposal?.titleSource).not.toBe('auto');
    expect(proposal?.title).toBe(currentTitle);
  });
});

test('stores a generated title when finish applies', { timeout: 10_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);

  await owner.client.mutation(internal.modules.travel.versions.agent.title.index.finish, {
    generation: 1,
    proposalId: version.proposalId,
    title: 'Extend Lisbon trip to 6 days'
  });

  await owner.client.run(async (ctx) => {
    const proposal = await ctx.db.get('tripProposals', version.proposalId);
    expect(proposal).toMatchObject({
      title: 'Extend Lisbon trip to 6 days',
      titleSource: 'auto'
    });
  });
});

test('scheduling title generation does not bump proposal updatedAt', {
  timeout: 10_000
}, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);
  const updatedAt = await owner.client.run(async (ctx) => {
    const proposal = await ctx.db.get('tripProposals', version.proposalId);
    return proposal?.updatedAt ?? 0;
  });

  await owner.client.mutation(api.routes.trips.update.run, {
    input: { ...changedTripDetails, dateNotes: 'November break' },
    tripId: version.workingTripId
  });

  await owner.client.run(async (ctx) => {
    const proposal = await ctx.db.get('tripProposals', version.proposalId);
    expect(proposal?.titleGeneration).toBe(2);
    expect(proposal?.updatedAt).toBe(updatedAt);
  });
});

test('schedules title generation after destination edits', { timeout: 10_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });

  await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({
      dayNotes: 'Old town and tiles',
      endDay: 2,
      startDay: 1
    }),
    tripId: version.workingTripId
  });

  await owner.client.run(async (ctx) => {
    const proposal = await ctx.db.get('tripProposals', version.proposalId);
    expect(proposal?.titleGeneration).toBe(1);
  });
});

test('ignores title generation for submitted ideas', { timeout: 10_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });

  await owner.client.mutation(internal.modules.travel.versions.agent.title.index.finish, {
    generation: 1,
    proposalId: version.proposalId,
    title: 'Should not apply after submit'
  });

  await expect(
    owner.client.query(api.routes.trips.versions.list.run, { tripId })
  ).resolves.toMatchObject([{ status: 'in_review', title: expect.stringMatching(/trip idea$/u) }]);
});
