import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { STARTER_ISSUES } from '#convex/modules/travel/issues/starters';
import { createOutsiderClient } from '#testing/factory';
import { openTripDraft, setupReviewedTrip, setupTrip, STARTER_ISSUE_COUNT } from '#testing/trips';
import { mergeIdea } from '#testing/versions';

test('scopes issue discussion to a trip and supports assigning the Issue agent', async () => {
  const { owner, reviewer: member, tripId } = await setupReviewedTrip();
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
  const issues = await owner.client.query(api.routes.trips.issues.list.run, { tripId });
  expect(issues).toHaveLength(STARTER_ISSUE_COUNT + 1);
  expect(issues.find((issue) => issue.id === issueId)?.status).toBe('closed');
  expect(issues.filter((issue) => issue.status === 'open')).toHaveLength(STARTER_ISSUE_COUNT);
});

test('records assign, reassign, and unassign system messages for people', async () => {
  const { owner, reviewer: member, tripId } = await setupReviewedTrip();
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
  const { owner, reviewer, tripId } = await setupReviewedTrip();
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Rename the trip through the protected proposal workflow.',
    title: 'Use a clearer trip name',
    tripId
  });
  const version = await openTripDraft(owner, tripId, { issueId });
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
    input: { currency: 'USD', destination: { status: 'undecided' }, name: 'Clearer trip name' },
    tripId: version.workingTripId
  });
  await mergeIdea(owner, reviewer, version.proposalId);
  const merged = await owner.client.query(api.routes.trips.issues.get.run, { issueId });
  expect(merged).toMatchObject({ idea: { status: 'merged' }, status: 'closed' });
  expect(merged?.comments.map((comment) => comment.content)).toEqual([
    'Test Person closed this by applying Implement: Use a clearer trip name'
  ]);
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
        labels: [],
        title: 'Add a rainy-day option',
        tripId,
        tripName: trip.name
      },
      // The starters opened with the trip follow, newest first; only the mandatory ones are labelled.
      ...STARTER_ISSUES.map(({ mandatory, title }) => ({
        labels: mandatory ? ['mandatory'] : [],
        title,
        tripId
      }))
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

test.each([
  ['a blank title', '   ', 'Body', 'Issue title must contain 1 to 160'],
  ['a title over 160 characters', 'x'.repeat(161), 'Body', 'Issue title must contain 1 to 160'],
  ['an empty description', 'Title', '', 'Issue description must contain 1 to 5000']
])('refuses %s', async (_name, title, body, message) => {
  const { owner, tripId } = await setupTrip(0);
  await expect(
    owner.client.mutation(api.routes.trips.issues.create.run, { body, title, tripId })
  ).rejects.toThrow(message);
});

test('accepts a title of exactly 160 characters', async () => {
  const { owner, tripId } = await setupTrip(0);
  await expect(
    owner.client.mutation(api.routes.trips.issues.create.run, {
      body: 'Body',
      title: 'x'.repeat(160),
      tripId
    })
  ).resolves.toEqual(expect.any(String));
});

async function setupStarter() {
  const setup = await setupReviewedTrip();
  const [starter] = await setup.owner.client.query(api.routes.trips.issues.list.run, {
    tripId: setup.tripId
  });
  if (!starter) throw new Error('Expected a starter issue');
  return { ...setup, issueId: starter.id };
}

const issueAgent = { agentId: 'issue' as const, kind: 'agent' as const, name: 'Issue agent' };

type StarterContext = Awaited<ReturnType<typeof setupStarter>>;

test.each<[string, (context: StarterContext) => Promise<object>]>([
  [
    'assigning a person',
    async ({ issueId, owner, reviewer }) => {
      await owner.client.mutation(api.routes.trips.issues.assign.run, {
        assignee: { kind: 'user', name: 'Group member 1', userId: reviewer.userId },
        issueId
      });
      return { assignee: { kind: 'user', userId: reviewer.userId } };
    }
  ],
  [
    'assigning the Issue agent',
    async ({ issueId, owner }) => {
      await owner.client.mutation(api.routes.trips.issues.assign.run, {
        assignee: issueAgent,
        issueId
      });
      return { assignee: issueAgent };
    }
  ],
  [
    'commenting',
    async ({ issueId, reviewer }) => {
      await reviewer.client.mutation(api.routes.trips.issues.comment.run, {
        content: 'Lisbon or Porto?',
        issueId
      });
      return { comments: [{ content: 'Lisbon or Porto?', kind: 'comment' }] };
    }
  ],
  [
    'setting a decide-by date',
    async ({ issueId, owner }) => {
      const dueAt = Date.UTC(2027, 0, 15);
      await owner.client.mutation(api.routes.trips.issues.due.run, { dueAt, issueId });
      return { dueAt };
    }
  ],
  [
    'starting work',
    async ({ issueId, owner }) => {
      await owner.client.mutation(api.routes.trips.issues.status.run, {
        issueId,
        status: 'in_progress'
      });
      return { closedAt: null, status: 'in_progress' };
    }
  ],
  [
    'starting an idea',
    async ({ issueId, owner, tripId }) => {
      const version = await owner.client.mutation(api.routes.trips.versions.create.run, {
        issueId,
        tripId
      });
      return { idea: { id: version.proposalId, workingTripId: version.workingTripId } };
    }
  ]
])('a starter accepts every normal issue write: %s', async (_name, write) => {
  const context = await setupStarter();
  const expected = await write(context);
  const { issueId, owner, tripId } = context;

  const detail = await owner.client.query(api.routes.trips.issues.get.run, { issueId });
  expect(detail).toMatchObject({ ...expected, labels: ['mandatory'] });
  const listed = await owner.client.query(api.routes.trips.issues.list.run, { tripId });
  expect(listed.find((issue) => issue.id === issueId)).toMatchObject({ labels: ['mandatory'] });
});

test('denies outsiders every issue read and write', async () => {
  const { issueId, owner, tripId } = await setupStarter();
  const { client } = await createOutsiderClient(owner.test);

  await expect(client.query(api.routes.trips.issues.list.run, { tripId })).rejects.toThrow(
    'Trip not found'
  );
  await expect(client.query(api.routes.trips.issues.get.run, { issueId })).resolves.toBeNull();
  for (const write of [
    () => client.mutation(api.routes.trips.issues.comment.run, { content: 'hi', issueId }),
    () => client.mutation(api.routes.trips.issues.status.run, { issueId, status: 'closed' }),
    () => client.mutation(api.routes.trips.issues.move.run, { issueId, status: 'closed' }),
    () => client.mutation(api.routes.trips.issues.due.run, { dueAt: 1, issueId }),
    () => client.mutation(api.routes.trips.issues.assign.run, { assignee: null, issueId }),
    () => client.mutation(api.routes.trips.issues.condition.run, { doneWhen: 'Done', issueId })
  ]) {
    await expect(write()).rejects.toThrow('Trip not found');
  }
});
