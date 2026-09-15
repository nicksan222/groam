import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import { setupTrip } from '#testing/trips';

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
  await owner.client.mutation(internal.modules.assistant.runs.functions.finishRun, {
    error: 'The model timed out',
    runId: failedRunId,
    status: 'failed'
  });

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
  await owner.client.mutation(internal.modules.assistant.runs.functions.finishRun, {
    runId: completeRunId,
    status: 'complete'
  });

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
  await first.owner.client.mutation(internal.modules.assistant.runs.functions.finishRun, {
    error: 'The model timed out',
    runId,
    status: 'failed'
  });
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

test('reopens the current idea instead of nesting when prepareTripVersion targets a working trip', {
  timeout: 15_000
}, async () => {
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
});
