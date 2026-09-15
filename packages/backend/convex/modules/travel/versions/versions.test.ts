import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import { setupGroup, setupTrip, tripInput, tripLocationInput } from '#testing/trips';
import { changedTripDetails, createTitledVersion, draftChangedVersion } from '#testing/versions';

test('stores user title source when creating ideas with a custom title', {
  timeout: 10_000
}, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await createTitledVersion(owner, tripId, 'Add a coastal day trip');

  await owner.client.run(async (ctx) => {
    const proposal = await ctx.db.get('tripProposals', version.proposalId);
    expect(proposal?.titleSource).toBe('user');
  });
});

test('stores default title source when creating ideas without a custom title', {
  timeout: 10_000
}, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });

  await owner.client.run(async (ctx) => {
    const proposal = await ctx.db.get('tripProposals', version.proposalId);
    expect(proposal?.titleSource).toBe('default');
  });
});

test('links an unlinked draft when starting an idea from an issue', {
  timeout: 10_000
}, async () => {
  const { owner, tripId } = await setupTrip();
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Add another day to the itinerary.',
    title: 'Add a day',
    tripId
  });
  const draft = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });

  const linked = await owner.client.mutation(api.routes.trips.versions.create.run, {
    issueId,
    tripId
  });
  expect(linked.proposalId).toBe(draft.proposalId);
  await expect(
    owner.client.query(api.routes.trips.issues.get.run, { issueId })
  ).resolves.toMatchObject({
    idea: {
      id: draft.proposalId,
      status: 'draft',
      title: 'Implement: Add a day'
    }
  });
});

test('refuses to implement an issue while another issue already owns the draft', {
  timeout: 10_000
}, async () => {
  const { owner, tripId } = await setupTrip();
  const firstIssueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'First assigned question.',
    title: 'Add a rainy-day option',
    tripId
  });
  const secondIssueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Second assigned question.',
    title: 'Add a day',
    tripId
  });
  await owner.client.mutation(api.routes.trips.versions.create.run, {
    issueId: firstIssueId,
    tripId
  });

  await expect(
    owner.client.mutation(api.routes.trips.versions.create.run, {
      issueId: secondIssueId,
      tripId
    })
  ).rejects.toThrow('Close or send your current draft before implementing another question');
});

test('applies generated titles to draft ideas with changes', { timeout: 10_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await draftChangedVersion(owner, tripId);

  await owner.client.mutation(internal.modules.travel.versions.agent.title.index.finish, {
    generation: 1,
    proposalId: version.proposalId,
    title: 'Extend Lisbon trip to 6 days'
  });

  await expect(
    owner.client.query(api.routes.trips.versions.list.run, { tripId })
  ).resolves.toMatchObject([{ title: 'Extend Lisbon trip to 6 days' }]);

  await owner.client.run(async (ctx) => {
    const proposal = await ctx.db.get('tripProposals', version.proposalId);
    expect(proposal?.titleSource).toBe('auto');
  });
});

test('does not overwrite user-provided idea titles', { timeout: 10_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await createTitledVersion(owner, tripId, 'Add a coastal day trip');
  await owner.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });

  await owner.client.mutation(internal.modules.travel.versions.agent.title.index.finish, {
    generation: 1,
    proposalId: version.proposalId,
    title: 'Different generated title'
  });

  await expect(
    owner.client.query(api.routes.trips.versions.list.run, { tripId })
  ).resolves.toMatchObject([{ title: 'Add a coastal day trip' }]);
});

test('starts a second auto-named idea after the first is applied', {
  timeout: 15_000
}, async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const reviewer = users[0];
  if (!reviewer) throw new Error('Expected reviewer');
  const first = await draftChangedVersion(owner, tripId);
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: first.proposalId
  });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: first.proposalId
  });
  await owner.client.action(api.routes.trips.versions.merge.run, {
    proposalId: first.proposalId
  });

  const second = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  expect(second.ideaName).toMatch(/^[a-z]+-[a-z]+$/u);
  expect(second.ideaName).not.toBe(first.ideaName);
  expect(second.proposalId).not.toBe(first.proposalId);
});

test('rejects a custom idea name that already exists on the trip', {
  timeout: 15_000
}, async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const reviewer = users[0];
  if (!reviewer) throw new Error('Expected reviewer');
  const first = await owner.client.mutation(api.routes.trips.versions.create.run, {
    ideaName: 'itinerary/add-coast-day',
    tripId
  });
  await owner.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: first.workingTripId
  });
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: first.proposalId
  });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: first.proposalId
  });
  await owner.client.action(api.routes.trips.versions.merge.run, {
    proposalId: first.proposalId
  });

  await expect(
    owner.client.mutation(api.routes.trips.versions.create.run, {
      ideaName: 'itinerary/add-coast-day',
      tripId
    })
  ).rejects.toThrow('already exists for this trip');
});

test('uses a custom idea name instead of the generated name', { timeout: 10_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, {
    ideaName: 'itinerary/add-coast-day',
    tripId
  });

  expect(version.ideaName).toBe('itinerary/add-coast-day');
  await expect(
    owner.client.query(api.routes.trips.versions.list.run, { tripId })
  ).resolves.toMatchObject([{ ideaName: 'itinerary/add-coast-day' }]);
  await expect(
    owner.client.query(api.routes.trips.find.run, { tripId: version.workingTripId })
  ).resolves.toMatchObject({
    proposal: { ideaName: 'itinerary/add-coast-day', sourceTripId: tripId }
  });
  const conversationId = await owner.client.mutation(api.routes.trips.versions.feedback.add.run, {
    content: 'A draft planning note',
    proposalId: version.proposalId
  });
  await owner.client.mutation(api.routes.trips.versions.feedback.add.run, {
    content: 'A reply in the same conversation',
    parentCommentId: conversationId,
    proposalId: version.proposalId
  });
  await expect(
    owner.client.query(api.routes.trips.versions.feedback.list.run, {
      proposalId: version.proposalId
    })
  ).resolves.toMatchObject([
    { content: 'A draft planning note', parentCommentId: null },
    { content: 'A reply in the same conversation', parentCommentId: conversationId }
  ]);
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ unresolvedFeedbackCount: 0 });
});

test('exposes source ids on idea working-copy itinerary items', { timeout: 10_000 }, async () => {
  const { owner } = await setupGroup();
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ destination: tripLocationInput() })
  });
  const source = await owner.client.query(api.routes.trips.find.run, { tripId });
  const sourceDestinationId = source?.destinations[0]?.id;
  if (!sourceDestinationId) throw new Error('Expected a seeded destination');
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  const [shared, working] = await Promise.all([
    owner.client.query(api.routes.trips.find.run, { tripId }),
    owner.client.query(api.routes.trips.find.run, { tripId: version.workingTripId })
  ]);

  expect(shared?.destinations[0]).toMatchObject({ id: sourceDestinationId, sourceId: null });
  expect(working?.destinations[0]).toMatchObject({
    name: shared?.destinations[0]?.name,
    sourceId: sourceDestinationId
  });
  expect(working?.destinations[0]?.id).not.toBe(sourceDestinationId);
});

test('lists workspace proposals and marks review requests for other members', {
  timeout: 10_000
}, async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const author = users[0];
  if (!author) throw new Error('Expected a proposal author');
  const version = await author.client.mutation(api.routes.trips.versions.create.run, {
    title: 'Add a coastal day trip',
    tripId
  });
  expect(version.ideaName).toMatch(/^[a-z]+-[a-z]+$/u);
  await author.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });
  await author.client.mutation(api.routes.trips.versions.reviewers.set.run, {
    proposalId: version.proposalId,
    reviewers: [{ kind: 'user', name: 'Test Owner', userId: owner.userId }]
  });
  await author.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });

  await expect(
    owner.client.query(api.routes.trips.versions.workspace.list.run, {
      paginationOpts: { cursor: null, numItems: 25 }
    })
  ).resolves.toMatchObject({
    page: [
      {
        id: version.proposalId,
        reviewRequested: true,
        sourceTripId: tripId,
        status: 'in_review',
        title: 'Add a coastal day trip'
      }
    ]
  });
  await expect(
    author.client.query(api.routes.trips.versions.workspace.list.run, {
      paginationOpts: { cursor: null, numItems: 25 }
    })
  ).resolves.toMatchObject({ page: [{ reviewRequested: false }] });
});

test('lists the viewer’s open draft even before it is shared', {
  timeout: 10_000
}, async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const author = users[0];
  if (!author) throw new Error('Expected a proposal author');
  const version = await author.client.mutation(api.routes.trips.versions.create.run, {
    title: 'Keep this draft private for now',
    tripId
  });

  await expect(
    author.client.query(api.routes.trips.versions.list.run, { tripId })
  ).resolves.toEqual([
    expect.objectContaining({
      id: version.proposalId,
      status: 'draft',
      title: 'Keep this draft private for now'
    })
  ]);
  await expect(
    author.client.query(api.routes.trips.versions.workspace.pending.run, {})
  ).resolves.toEqual([
    expect.objectContaining({
      id: version.proposalId,
      sourceTripId: tripId,
      status: 'draft',
      title: 'Keep this draft private for now',
      workingTripId: version.workingTripId
    })
  ]);
  await expect(
    owner.client.query(api.routes.trips.versions.workspace.pending.run, {})
  ).resolves.toEqual([]);
});

test('snapshots organization approval settings and requires independent reviewers', async () => {
  const { owner, tripId, users } = await setupTrip(2);
  await owner.client.mutation(api.routes.settings.reviews.set.run, { requiredApprovals: 2 });
  const author = users[0];
  const reviewer = users[1];
  if (!(author && reviewer)) throw new Error('Expected author and reviewer');
  const version = await author.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await author.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });
  await author.client.mutation(api.routes.trips.versions.reviewers.set.run, {
    proposalId: version.proposalId,
    reviewers: [
      { kind: 'user', name: 'Reviewer', userId: reviewer.userId },
      { kind: 'user', name: 'Owner', userId: owner.userId }
    ]
  });
  await author.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await expect(
    author.client.mutation(api.routes.trips.versions.approval.run, {
      approved: true,
      proposalId: version.proposalId
    })
  ).rejects.toThrow('authors cannot approve their own changes');
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });
  await expect(
    reviewer.client.action(api.routes.trips.versions.merge.run, { proposalId: version.proposalId })
  ).rejects.toThrow('Only the trip creator or a group admin can apply ideas');
  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, { proposalId: version.proposalId })
  ).rejects.toThrow('needs 2 approvals');
  await owner.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });
  await owner.client.action(api.routes.trips.versions.merge.run, {
    proposalId: version.proposalId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    name: 'Lisbon proposal'
  });
});

test('rejects applying an approved idea after the source trip is archived', {
  timeout: 15_000
}, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await owner.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await owner.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });
  await owner.client.mutation(api.routes.trips.archive.run, { tripId });
  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, { proposalId: version.proposalId })
  ).rejects.toThrow('Archived trips are read-only');
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    archivedAt: expect.any(Number)
  });
});

test('lets the proposal author self-approve when no human reviewers were requested', async () => {
  const { owner, tripId } = await setupTrip();
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await owner.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    approvalCount: 0,
    canApprove: true,
    canMerge: false,
    requiredApprovals: 1,
    reviewers: [{ agentId: 'reviewer', kind: 'agent', name: 'Idea reviewer' }]
  });
  await owner.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    approvalCount: 1,
    canApprove: true,
    canMerge: true,
    hasApproved: true
  });
  await owner.client.action(api.routes.trips.versions.merge.run, {
    proposalId: version.proposalId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    name: 'Lisbon proposal'
  });
});

test('blocks author self-approval once human reviewers are requested', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const reviewer = users[0];
  if (!reviewer) throw new Error('Expected reviewer');
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await owner.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });
  await owner.client.mutation(api.routes.trips.versions.reviewers.set.run, {
    proposalId: version.proposalId,
    reviewers: [{ kind: 'user', name: 'Reviewer', userId: reviewer.userId }]
  });
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await expect(
    owner.client.mutation(api.routes.trips.versions.approval.run, {
      approved: true,
      proposalId: version.proposalId
    })
  ).rejects.toThrow('authors cannot approve their own changes');
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ approvalCount: 0, canApprove: false, requiredApprovals: 1 });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });
  await owner.client.action(api.routes.trips.versions.merge.run, {
    proposalId: version.proposalId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    name: 'Lisbon proposal'
  });
});

test('assigns Idea reviewer on create and accepts advisory agent feedback without approval', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const author = users[0];
  if (!author) throw new Error('Expected proposal author');
  const version = await author.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await expect(
    author.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    reviewers: [{ agentId: 'reviewer', kind: 'agent', name: 'Idea reviewer' }]
  });
  await author.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });
  await author.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await owner.client.run(async (ctx) => {
    const runs = await ctx.db.query('agentRuns').collect();
    expect(
      runs.some(
        (run) =>
          run.proposalId === version.proposalId &&
          run.agentId === 'reviewer' &&
          run.status === 'queued'
      )
    ).toBe(true);
  });
  await owner.client.mutation(internal.modules.travel.versions.agent.review.index.finish, {
    comments: ['Confirm that the shorter schedule still includes travel time.'],
    proposalId: version.proposalId,
    summary: 'The shorter itinerary needs one timing clarification.'
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    approvalCount: 0,
    groamReview: {
      commentCount: 1,
      status: 'changes_requested',
      summary: 'The shorter itinerary needs one timing clarification.'
    },
    reviewers: [{ agentId: 'reviewer', kind: 'agent', name: 'Idea reviewer' }],
    unresolvedFeedbackCount: 1
  });
  await expect(
    owner.client.query(api.routes.trips.versions.feedback.list.run, {
      proposalId: version.proposalId
    })
  ).resolves.toMatchObject([
    {
      author: { agentId: 'reviewer', kind: 'agent', name: 'Idea reviewer' },
      content: 'Confirm that the shorter schedule still includes travel time.'
    }
  ]);
});

test('stores a passing Groam review without adding blocking feedback', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const author = users[0];
  if (!author) throw new Error('Expected proposal author');
  const version = await author.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await author.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });
  await author.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await owner.client.mutation(internal.modules.travel.versions.agent.review.index.finish, {
    comments: [],
    proposalId: version.proposalId,
    summary: 'Dates, pacing, and budget look consistent.'
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    feedbackCount: 0,
    groamReview: {
      commentCount: 0,
      status: 'passed',
      summary: 'Dates, pacing, and budget look consistent.'
    },
    unresolvedFeedbackCount: 0
  });
});

test('allows only an idea author to edit their draft idea', async () => {
  const { tripId, users } = await setupTrip(2);
  const [author, otherMember] = users;
  if (!(author && otherMember)) throw new Error('Expected two group members');
  const version = await author.client.mutation(api.routes.trips.versions.create.run, { tripId });

  await expect(
    otherMember.client.query(api.routes.trips.find.run, { tripId: version.workingTripId })
  ).resolves.toMatchObject({ permissions: { canEdit: false, isReadOnly: true } });
  await expect(
    otherMember.client.mutation(api.routes.trips.update.run, {
      input: { ...changedTripDetails, name: 'Another editor attempt' },
      tripId: version.workingTripId
    })
  ).rejects.toThrow('Only the idea author can edit this idea trip');
  await expect(
    otherMember.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput(),
      tripId: version.workingTripId
    })
  ).rejects.toThrow('Only the idea author can edit this idea trip');

  await expect(
    author.client.mutation(api.routes.trips.update.run, {
      input: changedTripDetails,
      tripId: version.workingTripId
    })
  ).resolves.toBeNull();
});

test('isolates editor changes, shows a diff, requires quorum, and merges the approved version', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const editor = users[0];
  if (!editor) throw new Error('Expected an editor');

  const version = await editor.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await expect(
    editor.client.mutation(api.routes.trips.update.run, { input: changedTripDetails, tripId })
  ).rejects.toThrow('You do not have permission to edit this trip');
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    name: 'Summer beach idea',
    permissions: { canEdit: false, canPropose: true }
  });
  await editor.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });
  await expect(
    owner.client.mutation(api.routes.trips.update.run, {
      input: { ...changedTripDetails, name: 'Owner collision attempt' },
      tripId: version.workingTripId
    })
  ).rejects.toThrow('Only the idea author can edit');

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    name: 'Summer beach idea'
  });
  await expect(
    editor.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    changes: expect.arrayContaining([
      expect.objectContaining({
        change: 'modified',
        entity: 'details',
        fields: expect.arrayContaining([
          expect.objectContaining({
            after: 'Lisbon proposal',
            before: 'Summer beach idea',
            key: 'name',
            label: 'Trip name'
          })
        ])
      })
    ]),
    status: 'draft'
  });

  await editor.client.mutation(api.routes.trips.versions.reviewers.set.run, {
    proposalId: version.proposalId,
    reviewers: [{ kind: 'user', name: 'Owner', userId: owner.userId }]
  });
  await editor.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await expect(
    editor.client.mutation(api.routes.trips.versions.approval.run, {
      approved: true,
      proposalId: version.proposalId
    })
  ).rejects.toThrow('authors cannot approve their own changes');
  const feedbackId = await owner.client.mutation(api.routes.trips.versions.feedback.add.run, {
    content: 'Please confirm the updated trip name.',
    kind: 'change_request',
    proposalId: version.proposalId
  });
  await expect(
    owner.client.query(api.routes.trips.versions.feedback.list.run, {
      proposalId: version.proposalId
    })
  ).resolves.toMatchObject([
    { content: 'Please confirm the updated trip name.', resolvedAt: null }
  ]);
  await expect(
    editor.client.action(api.routes.trips.versions.merge.run, {
      proposalId: version.proposalId
    })
  ).rejects.toThrow('Only the trip creator or a group admin can apply ideas');
  await owner.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });
  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, {
      proposalId: version.proposalId
    })
  ).rejects.toThrow('Resolve all idea feedback');
  await editor.client.mutation(api.routes.trips.versions.feedback.resolve.run, {
    commentId: feedbackId,
    proposalId: version.proposalId,
    resolved: true
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    status: 'in_review'
  });
  const beforeApply = await owner.client.query(api.routes.trips.versions.get.run, {
    proposalId: version.proposalId
  });
  expect(beforeApply).not.toHaveProperty('baseCommit');
  expect(beforeApply).not.toHaveProperty('tipCommit');
  expect(beforeApply).not.toHaveProperty('mergeCommit');
  await owner.client.action(api.routes.trips.versions.merge.run, {
    proposalId: version.proposalId
  });

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    currency: 'EUR',
    name: 'Lisbon proposal',
    permissions: { canEdit: false, canPropose: true }
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    status: 'merged'
  });
});

test('versions and merges every trip detail, including exact dates, duration, budget, and cover', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const reviewer = users[0];
  if (!reviewer) throw new Error('Expected reviewer');
  const originalCoverId = await owner.client.run((ctx) =>
    ctx.storage.store(new Blob(['original'], { type: 'image/png' }))
  );
  const proposedCoverId = await owner.client.run((ctx) =>
    ctx.storage.store(new Blob(['proposed'], { type: 'image/png' }))
  );
  await owner.client.run(async (ctx) => {
    const trip = await ctx.db.get('trips', tripId);
    if (!trip) throw new Error('Expected trip');
    await ctx.db.patch('trips', tripId, {
      cover: {
        asset: { source: 'upload', storageId: originalCoverId },
        generation: 1,
        status: 'ready'
      }
    });
  });
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await owner.client.run(async (ctx) => {
    const working = await ctx.db.get('trips', version.workingTripId);
    if (!working) throw new Error('Expected working trip');
    expect(working.cover).toMatchObject({ asset: { storageId: originalCoverId } });
    await ctx.db.patch('trips', version.workingTripId, {
      cover: {
        asset: { source: 'upload', storageId: proposedCoverId },
        generation: 2,
        status: 'ready'
      }
    });
  });
  await owner.client.mutation(api.routes.trips.update.run, {
    input: {
      budget: { amount: 4200 },
      currency: 'EUR',
      dateNotes: 'Confirmed dates',
      destination: { status: 'undecided' },
      duration: { totalDays: 9 },
      name: 'Fully versioned trip',
      startDate: '2027-05-10'
    },
    tripId: version.workingTripId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    coverUrl: expect.any(String),
    initialBudget: null,
    name: 'Summer beach idea',
    startDate: null
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    changes: [
      expect.objectContaining({
        fields: expect.arrayContaining(
          ['budget', 'cover', 'currency', 'dateNotes', 'duration', 'name', 'startDate'].map((key) =>
            expect.objectContaining({ key })
          )
        )
      })
    ]
  });
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });
  await owner.client.action(api.routes.trips.versions.merge.run, {
    proposalId: version.proposalId
  });
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    currency: 'EUR',
    dateNotes: 'Confirmed dates',
    initialBudget: 4200,
    name: 'Fully versioned trip',
    startDate: '2027-05-10',
    totalDurationDays: 9
  });
  await expect(owner.client.run((ctx) => ctx.db.get('trips', tripId))).resolves.toMatchObject({
    cover: { asset: { storageId: proposedCoverId } }
  });
});

test('lets another group member start their own idea while outsiders cannot read or apply', async () => {
  const first = await setupTrip(2);
  await first.owner.client.mutation(internal.modules.dev.populate.write, {
    activities: [],
    additionalDestinations: [tripLocationInput()],
    tripId: first.tripId
  });
  const editor = first.users[0];
  const participant = first.users[1];
  if (!(editor && participant)) throw new Error('Expected group members');
  const version = await editor.client.mutation(api.routes.trips.versions.create.run, {
    tripId: first.tripId
  });

  await expect(
    participant.client.mutation(api.routes.trips.versions.create.run, {
      ideaName: 'participant-copy',
      tripId: first.tripId
    })
  ).resolves.toMatchObject({ workingTripId: expect.any(String) });
  const second = await setupGroup();
  await expect(
    second.owner.client.query(api.routes.trips.versions.get.run, {
      proposalId: version.proposalId
    })
  ).rejects.toThrow('Idea trip not found');
  await expect(
    second.owner.client.action(api.routes.trips.versions.submit.run, {
      proposalId: version.proposalId
    })
  ).rejects.toThrow('Idea trip not found');
  await expect(
    second.owner.client.mutation(api.routes.trips.versions.approval.run, {
      approved: true,
      proposalId: version.proposalId
    })
  ).rejects.toThrow('Idea trip not found');
  await expect(
    second.owner.client.action(api.routes.trips.versions.merge.run, {
      proposalId: version.proposalId
    })
  ).rejects.toThrow('Idea trip not found');

  const sourceDetail = await editor.client.query(api.routes.trips.get.run, {
    tripId: first.tripId
  });
  await editor.client.mutation(api.routes.trips.update.run, {
    input: { ...changedTripDetails, destination: sourceDetail.destination },
    tripId: version.workingTripId
  });
  await editor.client.mutation(api.routes.trips.versions.reviewers.set.run, {
    proposalId: version.proposalId,
    reviewers: [
      { kind: 'user', name: 'Owner', userId: first.owner.userId },
      { kind: 'user', name: 'Participant', userId: participant.userId }
    ]
  });
  await editor.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await first.owner.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });
  await expect(
    editor.client.mutation(api.routes.trips.versions.approval.run, {
      approved: true,
      proposalId: version.proposalId
    })
  ).rejects.toThrow('authors cannot approve their own changes');
  await participant.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });

  const transferIdea = await first.owner.client.mutation(api.routes.trips.versions.create.run, {
    tripId: first.tripId
  });
  await first.owner.client.mutation(api.routes.trips.transfers.set.run, {
    boundary: 'arrival',
    input: { mode: 'train', notes: 'Added on the shared branch' },
    tripId: transferIdea.workingTripId
  });
  await first.owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: transferIdea.proposalId
  });
  await editor.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: transferIdea.proposalId
  });
  await first.owner.client.action(api.routes.trips.versions.merge.run, {
    proposalId: transferIdea.proposalId
  });
  const sharedAfterTransfer = await first.owner.client.query(api.routes.trips.get.run, {
    tripId: first.tripId
  });
  const sourceTransferId = sharedAfterTransfer.arrivalTransfer?.id;
  if (!sourceTransferId) throw new Error('Expected a shared arrival transfer');

  await expect(
    first.owner.client.action(api.routes.trips.versions.merge.run, {
      proposalId: version.proposalId
    })
  ).resolves.toBe('applied');
  await expect(
    first.owner.client.query(api.routes.trips.get.run, { tripId: first.tripId })
  ).resolves.toMatchObject({
    arrivalTransfer: { id: sourceTransferId, notes: 'Added on the shared branch' },
    name: changedTripDetails.name
  });
});

test('lets a group member keep editing their own idea', async () => {
  const { tripId, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a group member');
  const version = await member.client.mutation(api.routes.trips.versions.create.run, { tripId });

  await expect(
    member.client.mutation(api.routes.trips.update.run, {
      input: changedTripDetails,
      tripId: version.workingTripId
    })
  ).resolves.toBeNull();
});

test('preserves unchanged transfer identity when merging', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const reviewer = users[0];
  if (!reviewer) throw new Error('Expected reviewer');
  await owner.client.mutation(internal.modules.dev.populate.write, {
    activities: [],
    additionalDestinations: [tripLocationInput()],
    tripId
  });
  const seed = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await owner.client.mutation(api.routes.trips.transfers.set.run, {
    boundary: 'arrival',
    input: { mode: 'flight', notes: 'Keep the booking discussion' },
    tripId: seed.workingTripId
  });
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: seed.proposalId
  });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: seed.proposalId
  });
  await owner.client.action(api.routes.trips.versions.merge.run, {
    proposalId: seed.proposalId
  });
  const seeded = await owner.client.query(api.routes.trips.get.run, { tripId });
  const transferId = seeded.arrivalTransfer?.id;
  if (!transferId) throw new Error('Expected a shared arrival transfer');

  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  const working = await owner.client.query(api.routes.trips.get.run, {
    tripId: version.workingTripId
  });
  await owner.client.mutation(api.routes.trips.update.run, {
    input: {
      currency: working.currency,
      destination: working.destination,
      name: 'Transfer-preserving proposal',
      startDate: working.startDate ?? undefined
    },
    tripId: version.workingTripId
  });
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });
  await owner.client.action(api.routes.trips.versions.merge.run, {
    proposalId: version.proposalId
  });

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    arrivalTransfer: { id: transferId, notes: 'Keep the booking discussion' }
  });
});

test('submits a branch after the original changes and lets Git detect real conflicts at merge', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const reviewer = users[0];
  if (!reviewer) throw new Error('Expected reviewer');
  const version = await draftChangedVersion(owner, tripId);
  await owner.client.run(async (ctx) => {
    const trip = await ctx.db.get('trips', tripId);
    if (!trip) throw new Error('Expected source trip');
    await ctx.db.patch('trips', tripId, {
      name: 'Competing shared name',
      updatedAt: trip.updatedAt + 1
    });
  });
  await expect(
    owner.client.action(api.routes.trips.versions.submit.run, {
      proposalId: version.proposalId
    })
  ).resolves.toBeNull();
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });
  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, {
      proposalId: version.proposalId
    })
  ).resolves.toBe('conflicted');
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({
    canResolve: true,
    conflicts: [{ key: 'trip.json', label: 'Lisbon proposal' }],
    status: 'conflicted'
  });
  await expect(
    owner.client.action(api.routes.trips.versions.resolve.run, {
      proposalId: version.proposalId,
      resolutions: [{ choice: 'proposed', path: 'trip.json' }]
    })
  ).resolves.toBeNull();
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    name: 'Lisbon proposal'
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ conflicts: [], status: 'merged' });
});

test('keeps submitted working copies editable and limits closing to the author or organizer', async () => {
  const { owner, tripId, users } = await setupTrip(2);
  const [editor, participant] = users;
  if (!(editor && participant)) throw new Error('Expected group members');
  const version = await editor.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await editor.client.mutation(api.routes.trips.update.run, {
    input: changedTripDetails,
    tripId: version.workingTripId
  });
  await editor.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });

  await expect(
    editor.client.mutation(api.routes.trips.update.run, {
      input: { ...changedTripDetails, name: 'Refined during review' },
      tripId: version.workingTripId
    })
  ).resolves.toBeNull();
  await expect(
    editor.client.query(api.routes.trips.find.run, { tripId: version.workingTripId })
  ).resolves.toMatchObject({ name: 'Refined during review' });
  await expect(
    participant.client.mutation(api.routes.trips.versions.close.run, {
      proposalId: version.proposalId
    })
  ).rejects.toThrow('Only the author or an organizer');
  await expect(
    owner.client.mutation(api.routes.trips.versions.close.run, {
      proposalId: version.proposalId,
      reason: 'Keeping the original dates'
    })
  ).resolves.toBeNull();
});

test('closing a version clears any in-flight git operation', async () => {
  const { owner, tripId } = await setupTrip(0);
  const version = await draftChangedVersion(owner, tripId);
  await owner.client.mutation(internal.modules.travel.versions.workflow.prepareSubmit, {
    proposalId: version.proposalId
  });
  await owner.client.mutation(api.routes.trips.versions.close.run, {
    proposalId: version.proposalId
  });
  await expect(
    owner.client.run((ctx) =>
      ctx.db
        .query('tripProposalOperations')
        .withIndex('by_proposalId', (query) => query.eq('proposalId', version.proposalId))
        .unique()
    )
  ).resolves.toBeNull();
});

test('a racing draft edit invalidates the prepared submit operation', async () => {
  const { owner, tripId } = await setupTrip(0);
  const version = await draftChangedVersion(owner, tripId);
  const prepared = await owner.client.mutation(
    internal.modules.travel.versions.workflow.prepareSubmit,
    { proposalId: version.proposalId }
  );
  await owner.client.mutation(api.routes.trips.update.run, {
    input: { ...changedTripDetails, name: 'Edited during submit' },
    tripId: version.workingTripId
  });
  await expect(
    owner.client.mutation(internal.modules.travel.versions.workflow.finishSubmit, {
      baseCommit: 'a'.repeat(40),
      proposalId: version.proposalId,
      tipCommit: 'b'.repeat(40),
      token: prepared.token
    })
  ).rejects.toThrow('can no longer be shared');
});

test('rejects forged internal finish calls', async () => {
  const { owner, tripId } = await setupTrip(0);
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await expect(
    owner.client.mutation(internal.modules.travel.versions.workflow.finishSubmit, {
      baseCommit: 'a'.repeat(40),
      proposalId: version.proposalId,
      tipCommit: 'b'.repeat(40),
      token: 'forged-token'
    })
  ).rejects.toThrow('can no longer be shared');
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: version.proposalId })
  ).resolves.toMatchObject({ status: 'draft' });
});

test('stores large base snapshots outside list-facing proposal metadata', async () => {
  const { owner, tripId } = await setupTrip(0);
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  const stored = await owner.client.run(async (ctx) => ({
    proposal: await ctx.db.get('tripProposals', version.proposalId),
    snapshot: await ctx.db
      .query('tripProposalSnapshots')
      .withIndex('by_proposalId', (query) => query.eq('proposalId', version.proposalId))
      .unique()
  }));

  expect(stored.proposal).not.toBeNull();
  expect(stored.proposal && 'baseSnapshot' in stored.proposal).toBe(false);
  expect(stored.snapshot?.value).toContain('trip.json');
});

test('lists only original trips in the workspace trip list', async () => {
  const { owner } = await setupGroup();
  const tripId = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput()
  });
  await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  const list = await owner.client.query(api.routes.trips.list.run, {
    paginationOpts: { cursor: null, numItems: 25 }
  });
  expect(list.page.map((trip) => trip.id)).toEqual([tripId]);
});

test('rejects creating an idea from an idea working trip', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupTrip();
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  await expect(
    owner.client.mutation(api.routes.trips.versions.create.run, {
      tripId: version.workingTripId
    })
  ).rejects.toThrow('Start ideas from the shared trip');

  // Defense in depth: even if proposal metadata were missing on the working trip,
  // create must not nest an idea under another idea's working copy.
  await owner.client.run(async (ctx) => {
    await ctx.db.patch('trips', version.workingTripId, { proposal: undefined });
  });
  await expect(
    owner.client.mutation(api.routes.trips.versions.create.run, {
      tripId: version.workingTripId
    })
  ).rejects.toThrow('Start ideas from the shared trip');
});
