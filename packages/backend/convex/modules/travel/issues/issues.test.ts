import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { setupTrip } from '#testing/trips';

test('scopes issue discussion to a trip and supports assigning the Issue agent', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected member');
  const issueAgent = { agentId: 'issue' as const, kind: 'agent' as const, name: 'Issue agent' };

  const issueId = await member.client.mutation(api.routes.trips.issues.create.run, {
    body: 'The route needs a rainy-day option before implementation.',
    title: 'Add a rainy-day route option',
    tripId
  });
  const runId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  expect(runId).toEqual(expect.any(String));
  await owner.client.mutation(api.routes.trips.issues.comment.run, {
    content: 'Please include indoor activities and travel time.',
    issueId
  });

  await expect(
    owner.client.query(api.routes.trips.issues.get.run, { issueId })
  ).resolves.toMatchObject({
    assignee: issueAgent,
    comments: [
      {
        content: 'Test Person assigned this to Issue agent',
        kind: 'system'
      },
      {
        content: 'Please include indoor activities and travel time.',
        kind: 'comment'
      }
    ],
    status: 'open',
    title: 'Add a rainy-day route option'
  });
  await expect(
    owner.client.query(api.routes.agents.runs.issue.run, { issueId })
  ).resolves.toMatchObject({
    agentId: 'issue',
    id: runId,
    issueId,
    kickoff: 'assign',
    status: 'queued',
    surface: 'standalone',
    threadId: null
  });
  await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: null,
    issueId
  });
  await expect(
    owner.client.query(api.routes.trips.issues.get.run, { issueId })
  ).resolves.toMatchObject({
    assignee: null,
    comments: expect.arrayContaining([
      expect.objectContaining({
        content: 'Test Person unassigned Issue agent',
        kind: 'system'
      })
    ])
  });
  await expect(
    owner.client.query(api.routes.agents.runs.issue.run, { issueId })
  ).resolves.toMatchObject({ status: 'aborted' });
  await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  await owner.client.mutation(api.routes.trips.issues.status.run, {
    issueId,
    status: 'closed'
  });
  await expect(
    owner.client.query(api.routes.trips.issues.list.run, { tripId })
  ).resolves.toMatchObject([{ id: issueId, status: 'closed' }]);
});

test('records assign, reassign, and unassign system messages for people', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected member');
  const memberName = 'Group member 1';
  const ownerName = 'Test Person';

  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Decide who owns the rainy-day plan.',
    title: 'Own the rainy-day plan',
    tripId
  });

  await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: { kind: 'user', name: memberName, userId: member.userId },
    issueId
  });
  await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: { kind: 'user', name: ownerName, userId: owner.userId },
    issueId
  });
  await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: { kind: 'user', name: ownerName, userId: owner.userId },
    issueId
  });
  await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: null,
    issueId
  });

  const detail = await owner.client.query(api.routes.trips.issues.get.run, { issueId });
  expect(detail?.assignee).toBeNull();
  expect(detail?.comments).toEqual([
    expect.objectContaining({
      content: `${ownerName} assigned this to ${memberName}`,
      kind: 'system'
    }),
    expect.objectContaining({
      content: `${ownerName} assigned this to ${ownerName}`,
      kind: 'system'
    }),
    expect.objectContaining({
      content: `${ownerName} unassigned ${ownerName}`,
      kind: 'system'
    })
  ]);
});

test('links an issue to its implementing proposal and closes it when applied', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const reviewer = users[0];
  if (!reviewer) throw new Error('Expected reviewer');
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Rename the trip through the protected proposal workflow.',
    title: 'Use a clearer trip name',
    tripId
  });
  const version = await owner.client.mutation(api.routes.trips.versions.create.run, {
    issueId,
    tripId
  });
  await expect(
    owner.client.query(api.routes.trips.issues.get.run, { issueId })
  ).resolves.toMatchObject({
    idea: {
      id: version.proposalId,
      status: 'draft',
      title: 'Implement: Use a clearer trip name'
    }
  });
  await owner.client.mutation(api.routes.trips.update.run, {
    input: {
      currency: 'USD',
      destination: { status: 'undecided' },
      name: 'Clearer trip name'
    },
    tripId: version.workingTripId
  });
  await owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: version.proposalId
  });
  const feedbackId = await owner.client.mutation(api.routes.trips.versions.feedback.add.run, {
    content: 'The new name looks good after this note is resolved.',
    kind: 'change_request',
    proposalId: version.proposalId
  });
  await owner.client.mutation(api.routes.trips.versions.feedback.resolve.run, {
    commentId: feedbackId,
    proposalId: version.proposalId,
    resolved: true
  });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: version.proposalId
  });
  await owner.client.action(api.routes.trips.versions.merge.run, {
    proposalId: version.proposalId
  });
  await expect(
    owner.client.query(api.routes.trips.issues.get.run, { issueId })
  ).resolves.toMatchObject({ idea: { status: 'merged' }, status: 'closed' });
});

test('refuses cross-organization issue access', async () => {
  const first = await setupTrip(0);
  const second = await setupTrip(0);
  const issueId = await first.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Scope this work safely.',
    title: 'Scoped issue',
    tripId: first.tripId
  });

  await expect(
    second.owner.client.query(api.routes.trips.issues.get.run, { issueId })
  ).resolves.toBeNull();
});

test('lists workspace issues across trips with their trip names', async () => {
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'The group still needs a rainy-day plan.',
    title: 'Add a rainy-day option',
    tripId
  });
  const trip = await owner.client.query(api.routes.trips.get.run, { tripId });

  await expect(
    owner.client.query(api.routes.trips.issues.workspace.list.run, {
      paginationOpts: { cursor: null, numItems: 25 }
    })
  ).resolves.toMatchObject({
    page: [
      {
        id: issueId,
        title: 'Add a rainy-day option',
        tripId,
        tripName: trip.name
      }
    ]
  });
  await expect(
    owner.client.query(api.routes.trips.issues.get.run, { issueId })
  ).resolves.toMatchObject({ tripName: trip.name });
});

test('rejects an invalid workspace issue page size', async () => {
  const { owner } = await setupTrip(0);
  await expect(
    owner.client.query(api.routes.trips.issues.workspace.list.run, {
      paginationOpts: { cursor: null, numItems: 26 }
    })
  ).rejects.toThrow('issue page size must be between 1 and 25');
});
