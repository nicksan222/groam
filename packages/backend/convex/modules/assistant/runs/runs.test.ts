import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { setupTrip } from '#testing/trips';
import { draftChangedVersion } from '#testing/versions';

const issueAgent = { agentId: 'issue' as const, kind: 'agent' as const, name: 'Issue agent' };
const paginationOpts = { cursor: null, numItems: 10 };

test('lists one roster entry per registered agent kind', async () => {
  const { owner } = await setupTrip(0);
  await expect(owner.client.query(api.routes.agents.list.run, {})).resolves.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'groam', latestRun: null, status: 'idle', surface: 'chat' }),
      expect.objectContaining({
        id: 'issue',
        latestRun: null,
        status: 'idle',
        surface: 'standalone'
      }),
      expect.objectContaining({
        id: 'reviewer',
        latestRun: null,
        status: 'idle',
        surface: 'standalone'
      })
    ])
  );
});

test('includes the latest run on the matching roster entry', async () => {
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Show the latest worker run on the agents board.',
    title: 'Rainy-day option',
    tripId
  });
  const runId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  const roster = await owner.client.query(api.routes.agents.list.run, {});
  expect(roster.find((agent) => agent.id === 'issue')).toMatchObject({
    latestRun: {
      id: runId,
      status: 'queued',
      title: 'Rainy-day option'
    },
    status: 'working'
  });
  expect(roster.find((agent) => agent.id === 'groam')?.latestRun).toBeNull();
});

test('refuses assigning the chat agent to an issue', async () => {
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Chat Groam does not own issue work.',
    title: 'Keep chat off issues',
    tripId
  });
  await expect(
    owner.client.mutation(api.routes.trips.issues.assign.run, {
      assignee: { agentId: 'groam', kind: 'agent', name: 'Groam' } as never,
      issueId
    })
  ).rejects.toThrow();
});

test('reuses the active standalone issue run instead of queueing a duplicate', async () => {
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'One worker should own this.',
    title: 'Single active run',
    tripId
  });
  const first = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  const second = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  expect(second).toBe(first);
  const listed = await owner.client.query(api.routes.agents.runs.list.run, {
    agentId: 'issue',
    paginationOpts
  });
  expect(
    listed.page.filter((run) => run.status === 'queued' || run.status === 'running')
  ).toHaveLength(1);
});

test('hides another organization’s agent runs', async () => {
  const first = await setupTrip(0);
  const second = await setupTrip(0);
  const issueId = await first.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Scoped worker run.',
    title: 'Private issue',
    tripId: first.tripId
  });
  const runId = await first.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!runId) throw new Error('Expected a queued run');
  await expect(
    first.owner.client.query(api.routes.agents.runs.get.run, { runId })
  ).resolves.toMatchObject({
    related: {
      chatTitle: null,
      ideaTitle: null,
      issueTitle: 'Private issue',
      tripName: 'Summer beach idea'
    },
    title: 'Private issue'
  });
  const listed = await first.owner.client.query(api.routes.agents.runs.list.run, {
    agentId: 'issue',
    paginationOpts
  });
  expect(listed.page[0]?.related).toEqual({
    chatTitle: null,
    ideaTitle: null,
    issueTitle: null,
    tripName: null
  });
  await expect(
    second.owner.client.query(api.routes.agents.runs.get.run, { runId })
  ).rejects.toThrow('Agent run not found');
  await expect(
    second.owner.client.query(api.routes.agents.runs.issue.run, { issueId })
  ).resolves.toBeNull();
});

test('paginates run events newest first and records tools without activity receipts', async () => {
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Log every tool the worker uses.',
    title: 'Timeline coverage',
    tripId
  });
  const runId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!runId) throw new Error('Expected a queued run');

  await owner.client.mutation(internal.modules.assistant.runs.functions.recordEvent, {
    kind: 'status',
    label: 'Started working',
    runId
  });
  await owner.client.mutation(internal.modules.assistant.runs.functions.recordToolEvents, {
    events: [
      {
        input: '{"tripId":"trip-1"}',
        label: 'Read itinerary',
        ok: true,
        output: '{"tripName":"Lisbon"}',
        toolName: 'getItinerary'
      }
    ],
    runId
  });
  await owner.client.mutation(internal.modules.assistant.runs.functions.recordStepEvents, {
    events: [
      {
        detail: 'Check whether day 3 still has a transfer.',
        kind: 'thought',
        label: 'Thought'
      }
    ],
    runId
  });
  await owner.client.mutation(internal.modules.assistant.runs.functions.recordEvent, {
    detail: 'model timeout',
    kind: 'error',
    label: 'Run failed',
    runId
  });

  const first = await owner.client.query(api.routes.agents.runs.events.run, {
    paginationOpts: { cursor: null, numItems: 2 },
    runId
  });
  expect(first.page.map((event) => event.label)).toEqual(['Run failed', 'Thought']);
  expect(first.page.map((event) => event.seq)).toEqual([4, 3]);
  expect(first.page[1]).toMatchObject({
    detail: 'Check whether day 3 still has a transfer.',
    kind: 'thought'
  });
  expect(first.isDone).toBe(false);

  const rest = await owner.client.query(api.routes.agents.runs.events.run, {
    paginationOpts: { cursor: first.continueCursor, numItems: 2 },
    runId
  });
  expect(rest.page.map((event) => event.label)).toEqual(['Read itinerary', 'Started working']);
  expect(rest.page.map((event) => event.seq)).toEqual([2, 1]);
  expect(rest.isDone).toBe(true);

  await owner.client.mutation(internal.modules.assistant.runs.functions.recordEvent, {
    kind: 'status',
    label: 'Retrying',
    runId
  });
  const live = await owner.client.query(api.routes.agents.runs.events.run, {
    paginationOpts: { cursor: null, numItems: 2 },
    runId
  });
  expect(live.page.map((event) => event.label)).toEqual(['Retrying', 'Run failed']);
  expect(live.page[0]?.seq).toBe(5);
});

test('hides another organization’s run events', async () => {
  const first = await setupTrip(0);
  const second = await setupTrip(0);
  const issueId = await first.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Private worker log.',
    title: 'Hidden timeline',
    tripId: first.tripId
  });
  const runId = await first.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!runId) throw new Error('Expected a queued run');
  await first.owner.client.mutation(internal.modules.assistant.runs.functions.recordEvent, {
    kind: 'status',
    label: 'Started working',
    runId
  });
  await expect(
    second.owner.client.query(api.routes.agents.runs.events.run, {
      paginationOpts,
      runId
    })
  ).rejects.toThrow('Agent run not found');
});

test('lists every workspace run newest first and paginates across agents', async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a group member');
  const firstIssueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Older issue work.',
    title: 'Older issue',
    tripId
  });
  const olderRunId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId: firstIssueId
  });
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: 'workspace-runs-chat',
    memberUserIds: [member.userId],
    title: 'Packing help'
  });
  await owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: 'workspace-runs-chat-message',
    discussionId,
    text: '@groam What should we pack?'
  });
  const secondIssueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Newer issue work.',
    title: 'Newer issue',
    tripId
  });
  const newerRunId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId: secondIssueId
  });

  const firstPage = await owner.client.query(api.routes.agents.runs.workspace.run, {
    paginationOpts: { cursor: null, numItems: 2 }
  });
  expect(firstPage.page.map((item) => item.id)).toEqual([newerRunId, expect.any(String)]);
  expect(firstPage.page[0]).toMatchObject({
    agentId: 'issue',
    id: newerRunId,
    title: 'Newer issue'
  });
  expect(firstPage.page[1]).toMatchObject({
    agentId: 'groam',
    discussionId,
    title: 'Packing help'
  });
  expect(firstPage.isDone).toBe(false);

  const rest = await owner.client.query(api.routes.agents.runs.workspace.run, {
    paginationOpts: { cursor: firstPage.continueCursor, numItems: 2 }
  });
  expect(rest.page.map((item) => item.id)).toEqual([olderRunId]);
  expect(rest.page[0]).toMatchObject({ agentId: 'issue', title: 'Older issue' });
  expect(rest.isDone).toBe(true);
});

test('hides another organization’s runs from the workspace feed', async () => {
  const first = await setupTrip(0);
  const second = await setupTrip(0);
  const issueId = await first.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Scoped worker run.',
    title: 'Private issue',
    tripId: first.tripId
  });
  await first.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  await expect(
    second.owner.client.query(api.routes.agents.runs.workspace.run, { paginationOpts })
  ).resolves.toMatchObject({ isDone: true, page: [] });
});

test('rejects an invalid workspace run page size', async () => {
  const { owner } = await setupTrip(0);
  await expect(
    owner.client.query(api.routes.agents.runs.workspace.run, {
      paginationOpts: { cursor: null, numItems: 0 }
    })
  ).rejects.toThrow('run page size must be between 1 and 25');
  await expect(
    owner.client.query(api.routes.agents.runs.workspace.run, {
      paginationOpts: { cursor: null, numItems: 26 }
    })
  ).rejects.toThrow('run page size must be between 1 and 25');
});

test('retries a failed issue run from zero as a new queued run', async () => {
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Worker should start over after a failure.',
    title: 'Retry from zero',
    tripId
  });
  const failedRunId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!failedRunId) throw new Error('Expected a queued run');
  await owner.client.mutation(internal.modules.assistant.runs.functions.recordEvent, {
    kind: 'status',
    label: 'Started working',
    runId: failedRunId
  });
  await owner.test.run((ctx) =>
    AgentRuns.finish(ctx, {
      error: 'The model timed out',
      runId: failedRunId,
      status: 'failed'
    })
  );

  const nextRunId = await owner.client.mutation(api.routes.agents.runs.retry.run, {
    runId: failedRunId
  });
  expect(nextRunId).not.toBe(failedRunId);
  await expect(
    owner.client.query(api.routes.agents.runs.get.run, { runId: nextRunId })
  ).resolves.toMatchObject({
    id: nextRunId,
    issueId,
    kickoff: 'assign',
    status: 'queued',
    title: 'Retry from zero'
  });

  await owner.client.mutation(internal.modules.assistant.runs.functions.recordEvent, {
    kind: 'status',
    label: 'Started working',
    runId: nextRunId
  });
  const events = await owner.client.query(api.routes.agents.runs.events.run, {
    paginationOpts,
    runId: nextRunId
  });
  expect(events.page).toEqual([expect.objectContaining({ label: 'Started working', seq: 1 })]);
});

test('refuses retrying a run that has not failed', async () => {
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Still queued.',
    title: 'Active run',
    tripId
  });
  const runId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!runId) throw new Error('Expected a queued run');
  await expect(owner.client.mutation(api.routes.agents.runs.retry.run, { runId })).rejects.toThrow(
    'Stop this run before re-running'
  );
});

test('re-runs a complete issue run as a new queued run', async () => {
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Worker should start over after finishing.',
    title: 'Re-run complete',
    tripId
  });
  const completeRunId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!completeRunId) throw new Error('Expected a queued run');
  await owner.test.run((ctx) =>
    AgentRuns.finish(ctx, {
      runId: completeRunId,
      status: 'complete'
    })
  );

  const nextRunId = await owner.client.mutation(api.routes.agents.runs.retry.run, {
    runId: completeRunId
  });
  expect(nextRunId).not.toBe(completeRunId);
  await expect(
    owner.client.query(api.routes.agents.runs.get.run, { runId: nextRunId })
  ).resolves.toMatchObject({
    id: nextRunId,
    issueId,
    kickoff: 'assign',
    status: 'queued',
    title: 'Re-run complete'
  });
});

test('hides another organization’s failed run from retry', async () => {
  const first = await setupTrip(0);
  const second = await setupTrip(0);
  const issueId = await first.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Private failure.',
    title: 'Hidden retry',
    tripId: first.tripId
  });
  const runId = await first.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!runId) throw new Error('Expected a queued run');
  await first.owner.test.run((ctx) =>
    AgentRuns.finish(ctx, {
      error: 'The model timed out',
      runId,
      status: 'failed'
    })
  );
  await expect(
    second.owner.client.mutation(api.routes.agents.runs.retry.run, { runId })
  ).rejects.toThrow('Agent run not found');
});

test('lists assigned issues only for the selected issue activity', async () => {
  const { owner, tripId } = await setupTrip(0);
  const rainIssueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Cover a wet-weather plan.',
    title: 'Rainy-day option',
    tripId
  });
  const coastIssueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Plan a coastal day.',
    title: 'Coast day',
    tripId
  });
  await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId: rainIssueId
  });
  await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId: coastIssueId
  });

  await expect(
    owner.client.query(api.routes.agents.issues.run, { agentId: 'issue' })
  ).resolves.toEqual([]);
  await expect(
    owner.client.query(api.routes.agents.issues.run, {
      agentId: 'issue',
      issueId: rainIssueId,
      tripId
    })
  ).resolves.toEqual([
    expect.objectContaining({ id: rainIssueId, title: 'Rainy-day option', tripId })
  ]);
  await expect(
    owner.client.query(api.routes.agents.issues.run, {
      agentId: 'issue',
      issueId: coastIssueId,
      tripId
    })
  ).resolves.toEqual([expect.objectContaining({ id: coastIssueId, title: 'Coast day', tripId })]);
});

test('lists assigned issues for a trip or idea activity', async () => {
  const { owner, tripId } = await setupTrip(0);
  const rainIssueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Cover a wet-weather plan.',
    title: 'Rainy-day option',
    tripId
  });
  const coastIssueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Plan a coastal day.',
    title: 'Coast day',
    tripId
  });
  await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId: rainIssueId
  });
  await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId: coastIssueId
  });
  const idea = await owner.client.mutation(api.routes.trips.versions.create.run, {
    issueId: rainIssueId,
    tripId
  });

  const forTrip = await owner.client.query(api.routes.agents.issues.run, {
    agentId: 'issue',
    tripId
  });
  expect(forTrip.map((issue) => issue.id).sort()).toEqual([coastIssueId, rainIssueId].sort());
  await expect(
    owner.client.query(api.routes.agents.issues.run, {
      agentId: 'issue',
      proposalId: idea.proposalId
    })
  ).resolves.toEqual([
    expect.objectContaining({ id: rainIssueId, title: 'Rainy-day option', tripId })
  ]);
});

test('hides another organization’s assigned issues for an activity', async () => {
  const first = await setupTrip(0);
  const second = await setupTrip(0);
  const issueId = await first.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Scoped worker assignment.',
    title: 'Private issue',
    tripId: first.tripId
  });
  await first.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  await expect(
    second.owner.client.query(api.routes.agents.issues.run, {
      agentId: 'issue',
      issueId,
      tripId: first.tripId
    })
  ).resolves.toEqual([]);
});

test('attaches the started idea to the assigned issue run', { timeout: 15_000 }, async () => {
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Add another day to the itinerary.',
    title: 'Add a day',
    tripId
  });
  const runId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!runId) throw new Error('Expected an issue run');

  const version = await owner.client.mutation(
    internal.modules.assistant.model.index.prepareTripVersion,
    { issueId, runId, tripId }
  );

  await expect(
    owner.client.query(api.routes.trips.issues.get.run, { issueId })
  ).resolves.toMatchObject({
    idea: { id: version.proposalId, status: 'draft', title: 'Implement: Add a day' }
  });
  await expect(
    owner.client.query(api.routes.agents.runs.get.run, { runId })
  ).resolves.toMatchObject({
    issueId,
    proposalId: version.proposalId,
    related: { ideaTitle: expect.any(String), issueTitle: 'Add a day' }
  });
});

test(
  'reopens the current idea instead of nesting when prepareTripVersion targets a working trip',
  {
    timeout: 15_000
  },
  async () => {
    const { owner, tripId } = await setupTrip(0);
    const version = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });

    const reopened = await owner.client.mutation(
      internal.modules.assistant.model.index.prepareTripVersion,
      { tripId: version.workingTripId }
    );
    expect(reopened).toEqual({
      ideaName: version.ideaName,
      proposalId: version.proposalId,
      workingTripId: version.workingTripId
    });

    const proposals = await owner.client.query(api.routes.trips.versions.list.run, { tripId });
    expect(proposals).toHaveLength(1);
  }
);

test('counts unresolved issues, not closed or discarded ones, as an agent workload', async () => {
  const { owner, tripId } = await setupTrip(0);
  const assignAt = async (status: 'closed' | 'in_progress' | 'open' | 'wont_do') => {
    const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
      body: 'Look into this.',
      title: `Issue ${status}`,
      tripId
    });
    await owner.client.mutation(api.routes.trips.issues.assign.run, {
      assignee: issueAgent,
      issueId
    });
    await owner.client.mutation(api.routes.trips.issues.status.run, { issueId, status });
  };
  const workload = async () => {
    const roster = await owner.client.query(api.routes.agents.list.run, {});
    return roster.find((agent) => agent.id === 'issue')?.assignedIssueCount;
  };

  await assignAt('open');
  expect(await workload()).toBe(1);
  await assignAt('in_progress');
  expect(await workload()).toBe(2);
  await assignAt('closed');
  await assignAt('wont_do');
  expect(await workload()).toBe(2);
});

test('claims the queued discussion run even after many finished runs', async () => {
  const { owner, organizationId } = await queuedDiscussionSetup();
  const result = await owner.test.run(async (ctx) => {
    const discussionId = await ctx.db.insert('discussions', {
      shortId: 'fixture1',
      clientRequestId: 'req-1',
      createdBy: { name: 'Owner', userId: owner.userId },
      kind: 'group',
      members: [],
      organizationId,
      title: 'Busy chat',
      updatedAt: Date.now()
    });
    const base = {
      agentId: 'groam' as const,
      createdBy: { name: 'Owner', userId: owner.userId },
      discussionId,
      kickoff: 'assign' as const,
      organizationId,
      surface: 'chat' as const,
      title: 'Turn'
    };
    for (let index = 0; index < 60; index++) {
      await ctx.db.insert('agentRuns', {
        shortId: 'fixture2',
        ...base,
        status: 'complete',
        updatedAt: 1000 + index
      });
    }
    const queuedId = await ctx.db.insert('agentRuns', {
      shortId: 'fixture3',
      ...base,
      status: 'queued',
      updatedAt: 5000
    });
    const claimedId = await AgentRuns.claimDiscussionTurn(ctx, {
      actorTokenIdentifier: 'issuer|owner',
      agentId: 'groam',
      createdBy: base.createdBy,
      discussionId,
      discussionUpdatedAt: 1,
      organizationId,
      promptMessageId: 'msg-busy',
      screen: {
        capabilities: [],
        data: '{}',
        description: 'Chat',
        key: 'chat:busy',
        target: { kind: 'workspace' },
        title: 'Busy chat'
      },
      threadId: 'thread-1',
      title: 'Turn'
    });
    const all = await ctx.db
      .query('agentRuns')
      .withIndex('by_discussionId_and_updatedAt', (query) => query.eq('discussionId', discussionId))
      .collect();
    return { claimedId, count: all.length, queuedId };
  });
  expect(result.claimedId).toBe(result.queuedId);
  expect(result.count).toBe(61);
});

test('the sweep fails stuck runs no workflow owns and never touches workflow runs', async () => {
  const { owner, organizationId } = await queuedDiscussionSetup();
  const base = {
    agentId: 'reviewer' as const,
    createdBy: { name: 'Owner', userId: owner.userId },
    kickoff: 'assign' as const,
    organizationId,
    surface: 'standalone' as const,
    title: 'Sweep'
  };
  const old = Date.now() - 30 * 60_000;
  const ids = await owner.test.run(async (ctx) => {
    const discussionId = await ctx.db.insert('discussions', {
      shortId: 'sweep001',
      clientRequestId: 'req-sweep',
      createdBy: { name: 'Owner', userId: owner.userId },
      kind: 'group',
      members: [],
      organizationId,
      threadId: 'thread-sweep',
      title: 'Sweep',
      updatedAt: old
    });
    const neverResponded = await AgentRuns.queueDiscussionTurn(ctx, {
      agentId: 'groam',
      createdBy: base.createdBy,
      discussionId,
      organizationId,
      threadId: 'thread-sweep',
      title: 'Sweep'
    });
    await ctx.db.patch('agentRuns', neverResponded, { updatedAt: old });
    return {
      freshInline: await ctx.db.insert('agentRuns', {
        ...base,
        shortId: 'sweep002',
        status: 'running',
        updatedAt: Date.now() - 60_000
      }),
      neverResponded,
      stuckInline: await ctx.db.insert('agentRuns', {
        ...base,
        shortId: 'sweep003',
        status: 'running',
        updatedAt: old
      }),
      workflowQueued: await ctx.db.insert('agentRuns', {
        ...base,
        shortId: 'sweep004',
        status: 'queued',
        updatedAt: old,
        workflowId: 'wf-queued'
      }),
      workflowRunning: await ctx.db.insert('agentRuns', {
        ...base,
        shortId: 'sweep005',
        status: 'running',
        updatedAt: old,
        workflowId: 'wf-running'
      })
    };
  });
  await expect(
    owner.test.mutation(internal.modules.assistant.runs.functions.sweepStaleRuns, {})
  ).resolves.toBe(2);
  await owner.test.run(async (ctx) => {
    const status = async (id: Id<'agentRuns'>) => (await ctx.db.get('agentRuns', id))?.status;
    expect(await ctx.db.get('agentRuns', ids.stuckInline)).toMatchObject({
      error: 'The run stopped responding. Try again.',
      status: 'failed'
    });
    expect(await status(ids.neverResponded)).toBe('failed');
    expect(await status(ids.freshInline)).toBe('running');
    expect(await status(ids.workflowQueued)).toBe('queued');
    expect(await status(ids.workflowRunning)).toBe('running');
  });
});

async function queuedDiscussionSetup() {
  const { owner } = await setupTrip(0);
  if (!owner.organizationId) throw new Error('Expected an organization');
  return { organizationId: owner.organizationId, owner };
}

test('assigning an issue to the agent starts its run workflow server-side', async () => {
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Board assignment should start work.',
    title: 'Board assign',
    tripId
  });
  const runId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!runId) throw new Error('Expected a run');
  const run = await owner.test.run((ctx) => ctx.db.get('agentRuns', runId));
  expect(run).toMatchObject({
    actorTokenIdentifier: expect.any(String),
    status: 'queued',
    workflowId: expect.any(String)
  });
});

test('does not reuse another group’s active review run for a proposal', async () => {
  const a = await setupTrip(0);
  if (!a.owner.organizationId) throw new Error('Expected organizations');
  const { proposalId } = await draftChangedVersion(a.owner, a.tripId);
  const { first, second } = await a.owner.test.run(async (ctx) => {
    const base = {
      createdBy: { name: 'A', userId: a.owner.userId },
      proposalId,
      title: 'Review',
      tripId: a.tripId
    };
    const first = await AgentRuns.queueReviewRun(ctx, {
      ...base,
      organizationId: a.owner.organizationId as string
    });
    const second = await AgentRuns.queueReviewRun(ctx, {
      ...base,
      organizationId: 'org-of-another-group'
    });
    return { first, second };
  });
  expect(second).not.toBe(first);
});

async function privateDiscussionRuns(
  owner: Awaited<ReturnType<typeof setupTrip>>['owner'],
  statuses: Array<'queued' | 'running'> = ['running']
) {
  const organizationId = owner.organizationId as string;
  return await owner.test.run(async (ctx) => {
    const discussionId = await ctx.db.insert('discussions', {
      shortId: 'priv0001',
      clientRequestId: 'req-priv',
      createdBy: { name: 'Owner', userId: owner.userId },
      kind: 'group',
      members: [],
      organizationId,
      title: 'Secret plans',
      updatedAt: Date.now()
    });
    await ctx.db.insert('discussionMembers', {
      discussionId,
      kind: 'group',
      organizationId,
      userId: owner.userId
    });
    const runIds = [];
    for (const [index, status] of statuses.entries()) {
      runIds.push(
        await ctx.db.insert('agentRuns', {
          shortId: `privrun${index}`,
          agentId: 'groam',
          createdBy: { name: 'Owner', userId: owner.userId },
          discussionId,
          kickoff: 'assign',
          organizationId,
          report: 'Private reply',
          startedAt: status === 'running' ? Date.now() : undefined,
          status,
          surface: 'chat',
          threadId: 'thread-priv',
          title: 'Secret plans',
          updatedAt: Date.now() + index
        })
      );
    }
    return { discussionId, runIds };
  });
}

test('hides discussion runs from org members outside the discussion', async () => {
  const { owner, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a member');
  const {
    runIds: [runId]
  } = await privateDiscussionRuns(owner);
  if (!runId) throw new Error('Expected a run');

  await expect(
    owner.client.query(api.routes.agents.runs.get.run, { runId })
  ).resolves.toMatchObject({ report: 'Private reply' });
  await expect(member.client.query(api.routes.agents.runs.get.run, { runId })).rejects.toThrow(
    'Agent run not found'
  );
  await expect(
    member.client.query(api.routes.agents.runs.events.run, { paginationOpts, runId })
  ).rejects.toThrow('Agent run not found');

  const feed = await member.client.query(api.routes.agents.runs.workspace.run, { paginationOpts });
  expect(feed.page.some((run) => run.id === runId)).toBe(false);
  const byAgent = await member.client.query(api.routes.agents.runs.list.run, {
    agentId: 'groam',
    paginationOpts
  });
  expect(byAgent.page.some((run) => run.id === runId)).toBe(false);
  const roster = await member.client.query(api.routes.agents.list.run, {});
  expect(roster.find((agent) => agent.id === 'groam')).toMatchObject({
    activeRunCount: 0,
    latestRun: null
  });
  const ownerFeed = await owner.client.query(api.routes.agents.runs.workspace.run, {
    paginationOpts
  });
  expect(ownerFeed.page.some((run) => run.id === runId)).toBe(true);
});

test('stopping a discussion run requires discussion membership', async () => {
  const { owner, users } = await setupTrip(1);
  const member = users[0];
  if (!member) throw new Error('Expected a member');
  const {
    runIds: [runId]
  } = await privateDiscussionRuns(owner);
  if (!runId) throw new Error('Expected a run');
  await expect(member.client.mutation(api.routes.agents.runs.stop.run, { runId })).rejects.toThrow(
    'Agent run not found'
  );
  await owner.client.mutation(api.routes.agents.runs.stop.run, { runId });
  await expect(
    owner.client.query(api.routes.agents.runs.get.run, { runId })
  ).resolves.toMatchObject({ status: 'aborted' });
});

test('aborting a discussion stops the running turn, not a newer queued one', async () => {
  const { owner } = await setupTrip(0);
  const {
    discussionId,
    runIds: [runningId, queuedId]
  } = await privateDiscussionRuns(owner, ['running', 'queued']);
  if (!runningId || !queuedId) throw new Error('Expected runs');
  await owner.test.run(async (ctx) => {
    await AgentRuns.abortActiveForDiscussion(ctx, discussionId);
    expect((await ctx.db.get('agentRuns', runningId))?.status).toBe('aborted');
    expect((await ctx.db.get('agentRuns', queuedId))?.status).toBe('queued');
  });
});

async function failedIssueRun(
  setup: Awaited<ReturnType<typeof setupTrip>>,
  title: string
): Promise<{ issueId: Id<'tripIssues'>; runId: Id<'agentRuns'> }> {
  const { owner, tripId } = setup;
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Authz fixture.',
    title,
    tripId
  });
  const runId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!runId) throw new Error('Expected a queued run');
  await owner.test.run((ctx) =>
    AgentRuns.finish(ctx, {
      error: 'boom',
      runId,
      status: 'failed'
    })
  );
  return { issueId, runId };
}

test('retry queues a fresh run and starts its workflow as the retrying viewer', async () => {
  const setup = await setupTrip(0);
  const { runId } = await failedIssueRun(setup, 'Retry queues');
  const nextRunId = await setup.owner.client.mutation(api.routes.agents.runs.retry.run, {
    runId
  });
  expect(nextRunId).not.toBe(runId);
  const next = await setup.owner.test.run((ctx) => ctx.db.get('agentRuns', nextRunId));
  expect(next).toMatchObject({
    actorTokenIdentifier: expect.any(String),
    status: 'queued',
    workflowId: expect.any(String)
  });
});

test('refuses retry and stop from a non-admin who did not start the run', async () => {
  const setup = await setupTrip(1);
  const member = setup.users[0];
  if (!member) throw new Error('Expected a member');
  const { runId } = await failedIssueRun(setup, 'Admin only retry');
  await expect(member.client.mutation(api.routes.agents.runs.retry.run, { runId })).rejects.toThrow(
    'Only the trip creator or a group admin'
  );
  const active = await setup.owner.test.run(async (ctx) => {
    const run = await ctx.db.get('agentRuns', runId);
    if (!run) throw new Error('Expected a run');
    return await ctx.db.insert('agentRuns', {
      shortId: 'activerun',
      agentId: run.agentId,
      createdBy: run.createdBy,
      issueId: run.issueId as Id<'tripIssues'>,
      kickoff: 'assign',
      organizationId: run.organizationId,
      status: 'running',
      surface: 'standalone',
      title: 'Active',
      tripId: run.tripId as Id<'trips'>,
      updatedAt: Date.now()
    });
  });
  await expect(
    member.client.mutation(api.routes.agents.runs.stop.run, { runId: active })
  ).rejects.toThrow('Only the trip creator or a group admin');
  await setup.owner.client.mutation(api.routes.agents.runs.stop.run, { runId: active });
});

test('refuses retrying a run whose issue is resolved', async () => {
  const setup = await setupTrip(0);
  const { issueId, runId } = await failedIssueRun(setup, 'Resolved retry');
  await setup.owner.test.run(async (ctx) => {
    await ctx.db.patch('tripIssues', issueId, { status: 'closed' as never });
  });
  await expect(
    setup.owner.client.mutation(api.routes.agents.runs.retry.run, { runId })
  ).rejects.toThrow('Resolved issues cannot be re-run');
});

test('roster finds the Issue agent run behind many newer runs of other agents', async () => {
  const { owner, organizationId } = await queuedDiscussionSetup();
  await owner.test.run(async (ctx) => {
    const base = {
      createdBy: { name: 'Owner', userId: owner.userId },
      kickoff: 'assign' as const,
      organizationId,
      status: 'complete' as const,
      title: 'Run'
    };
    await ctx.db.insert('agentRuns', {
      shortId: 'oldissue',
      ...base,
      agentId: 'issue',
      surface: 'standalone',
      updatedAt: 1000
    });
    for (let index = 0; index < 230; index++) {
      await ctx.db.insert('agentRuns', {
        shortId: `noise${index}`,
        ...base,
        agentId: 'reviewer',
        surface: 'standalone',
        updatedAt: 2000 + index
      });
    }
  });
  const roster = await owner.client.query(api.routes.agents.list.run, {});
  expect(roster.find((agent) => agent.id === 'issue')?.latestRun).toMatchObject({
    updatedAt: 1000
  });
});

test('a claimed discussion turn stores its actor, screen, and prompt for the workflow', async () => {
  const { owner } = await setupTrip(0);
  const organizationId = owner.organizationId as string;
  const runId = await owner.test.run(async (ctx) => {
    const discussionId = await ctx.db.insert('discussions', {
      shortId: 'actr0001',
      clientRequestId: 'req-actor',
      createdBy: { name: 'Owner', userId: owner.userId },
      kind: 'group',
      members: [],
      organizationId,
      threadId: 'thread-actor',
      title: 'Plans',
      updatedAt: 1
    });
    return await AgentRuns.claimDiscussionTurn(ctx, {
      actorTokenIdentifier: 'issuer|owner',
      agentId: 'groam',
      createdBy: { name: 'Owner', userId: owner.userId },
      discussionId,
      discussionUpdatedAt: 1,
      organizationId,
      promptMessageId: 'msg-1',
      screen: {
        capabilities: [],
        data: '{}',
        description: 'Chat',
        key: 'chat:x',
        target: { kind: 'workspace' },
        title: 'Chat'
      },
      threadId: 'thread-actor',
      title: 'Plans'
    });
  });
  await owner.test.run(async (ctx) => {
    expect(await ctx.db.get('agentRuns', runId)).toMatchObject({
      actorTokenIdentifier: 'issuer|owner',
      discussionUpdatedAt: 1,
      promptMessageId: 'msg-1',
      screen: { key: 'chat:x' },
      status: 'running'
    });
  });
});
