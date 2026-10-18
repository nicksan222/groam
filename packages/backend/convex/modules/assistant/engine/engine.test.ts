import { mockModel } from '@convex-dev/agent';
import { getStatus, type WorkflowId } from '@convex-dev/workflow';
import { expectConsole } from '@groam/vitest-config/console';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, components, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { setupTrip, setupWritableTrip } from '#testing/trips';
import { runUntil } from '#testing/workflows';

// Runs advance through workflow steps on scheduled functions.
vi.useRealTimers();
afterEach(() => vi.restoreAllMocks());

const issueAgent = { agentId: 'issue' as const, kind: 'agent' as const, name: 'Issue agent' };

type Trip = Awaited<ReturnType<typeof setupTrip>>;

function useModel(model: ReturnType<typeof mockModel>) {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: model,
    modelId: 'test-model'
  } as never);
}

async function assignedIssueRun() {
  const trip = await setupTrip(0);
  const issueId = await trip.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Pick a rainy-day option.',
    title: 'Rainy-day option',
    tripId: trip.tripId
  });
  const runId = await trip.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!runId) throw new Error('Expected a run');
  return { ...trip, runId };
}

async function runDoc(trip: Trip, runId: Id<'agentRuns'>) {
  return await trip.owner.test.run((ctx) => ctx.db.get('agentRuns', runId));
}

test('assigning an issue starts a workflow that completes the run with its report', async () => {
  useModel(mockModel({ content: [{ text: 'Booked the museum for a rainy day.', type: 'text' }] }));
  const trip = await assignedIssueRun();
  await runUntil(
    trip.owner.test,
    async () => (await runDoc(trip, trip.runId))?.status === 'complete'
  );
  expect(await runDoc(trip, trip.runId)).toMatchObject({
    headline: 'Booked the museum for a rainy day.',
    report: 'Booked the museum for a rainy day.',
    status: 'complete',
    workflowId: expect.any(String)
  });
});

test('an empty standalone reply fails the run with today’s copy', async () => {
  useModel(mockModel({ content: [] }));
  expectConsole('error', 'standalone agent run failed');
  const trip = await assignedIssueRun();
  await runUntil(
    trip.owner.test,
    async () => (await runDoc(trip, trip.runId))?.status === 'failed'
  );
  expect((await runDoc(trip, trip.runId))?.error).toContain('The agent returned nothing');
});

test('starting the same run twice keeps one workflow', async () => {
  useModel(mockModel({ content: [{ text: 'Done.', type: 'text' }] }));
  const trip = await assignedIssueRun();
  const first = (await runDoc(trip, trip.runId))?.workflowId;
  expect(first).toEqual(expect.any(String));
  await trip.owner.client.action(api.routes.agents.runs.start.run, { runId: trip.runId });
  expect((await runDoc(trip, trip.runId))?.workflowId).toBe(first);
  await runUntil(
    trip.owner.test,
    async () => (await runDoc(trip, trip.runId))?.status === 'complete'
  );
});

test('stopping a run mid-turn cancels its workflow and keeps it aborted', async () => {
  // Hold the turn inside the provider lookup so the stop lands while it is in flight.
  let started!: () => void;
  const turnStarted = new Promise<void>((resolve) => (started = resolve));
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  vi.spyOn(AssistantProvider, 'configured').mockImplementation(async () => {
    started();
    await released;
    return {
      languageModel: mockModel({ content: [{ text: 'Done.', type: 'text' }] }),
      modelId: 'test-model'
    } as never;
  });
  // The cancelled step still reports back once: the workflow and its workpool log that they
  // ignored it.
  expectConsole('error', /already has generation number/);
  expectConsole('warn', /work is gone, but trying to cancel/);
  const errors = vi.spyOn(console, 'error');
  const warnings = vi.spyOn(console, 'warn');
  const logged = (spy: typeof errors, text: string) =>
    spy.mock.calls.some((call) => String(call[0]).includes(text));
  const trip = await assignedIssueRun();
  await turnStarted;
  await trip.owner.client.mutation(api.routes.agents.runs.stop.run, { runId: trip.runId });
  const workflowId = (await runDoc(trip, trip.runId))?.workflowId as WorkflowId;
  expect(
    await trip.owner.test.run((ctx) => getStatus(ctx, components.workflow, workflowId))
  ).toEqual({ type: 'canceled' });
  release();
  await runUntil(
    trip.owner.test,
    async () =>
      logged(errors, 'already has generation number') &&
      logged(warnings, 'work is gone, but trying to cancel')
  );
  // The finished turn may still log events, but the stopped run never completes.
  const stopped = await runDoc(trip, trip.runId);
  expect(stopped?.status).toBe('aborted');
  expect(stopped?.report).toBeUndefined();
});

test('a discussion turn streams through the workflow and finishes the request', async () => {
  useModel(mockModel({ content: [{ text: 'Sushi on Friday works.', type: 'text' }] }));
  const { owner, tripId, users } = await setupTrip(1);
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: users.map((user) => user.userId),
    title: 'Dinner',
    tripId
  });
  const sent = await owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: crypto.randomUUID(),
    discussionId,
    text: '@groam where should we eat?'
  });
  await owner.client.action(api.routes.discussions.messages.respond.run, {
    discussionId,
    promptMessageId: sent.messageId,
    screen: {
      capabilities: [],
      data: '{}',
      description: 'Chat',
      key: `chat:${discussionId}`,
      target: { kind: 'workspace' },
      title: 'Dinner'
    }
  });
  const request = async () =>
    await owner.test.run((ctx) =>
      ctx.db
        .query('discussionMessages')
        .withIndex('by_discussionId_and_agentMessageId', (query) =>
          query.eq('discussionId', discussionId).eq('agentMessageId', sent.messageId)
        )
        .unique()
    );
  await runUntil(owner.test, async () => (await request())?.assistantStatus === 'complete');
  const run = await owner.test.run((ctx) =>
    ctx.db
      .query('agentRuns')
      .withIndex('by_discussionId_and_updatedAt', (query) => query.eq('discussionId', discussionId))
      .first()
  );
  expect(run).toMatchObject({
    report: 'Sushi on Friday works.',
    status: 'complete',
    workflowId: expect.any(String)
  });
  const [listed] = await owner.client.query(api.routes.discussions.list.run, {});
  expect(listed?.lastMessage?.text).toBe('Sushi on Friday works.');
});

test('a blank discussion reply fails the request with the empty-reply copy', async () => {
  useModel(mockModel({ content: [{ text: '   ', type: 'text' }] }));
  expectConsole('error', 'discussion assistant respond failed');
  const { owner, tripId, users } = await setupTrip(1);
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: users.map((user) => user.userId),
    title: 'Blank',
    tripId
  });
  const sent = await owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: crypto.randomUUID(),
    discussionId,
    text: '@groam anything?'
  });
  await owner.client.action(api.routes.discussions.messages.respond.run, {
    discussionId,
    promptMessageId: sent.messageId,
    screen: {
      capabilities: [],
      data: '{}',
      description: 'Chat',
      key: `chat:${discussionId}`,
      target: { kind: 'workspace' },
      title: 'Blank'
    }
  });
  await runUntil(owner.test, async () => {
    const message = await owner.test.run((ctx) =>
      ctx.db
        .query('discussionMessages')
        .withIndex('by_discussionId_and_agentMessageId', (query) =>
          query.eq('discussionId', discussionId).eq('agentMessageId', sent.messageId)
        )
        .unique()
    );
    return message?.assistantStatus === 'failed';
  });
  const run = await owner.test.run((ctx) =>
    ctx.db
      .query('agentRuns')
      .withIndex('by_discussionId_and_updatedAt', (query) => query.eq('discussionId', discussionId))
      .first()
  );
  expect(run?.status).toBe('failed');
});

test('a workflow turn writes to the trip as the run creator through its tools', async () => {
  const trip = await setupWritableTrip(0);
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: mockModel({
      contentSteps: [
        [
          {
            input: JSON.stringify({
              latitude: 41.1579,
              longitude: -8.6291,
              name: 'Porto',
              placeId: 'place-porto',
              tripId: trip.tripId
            }),
            toolCallId: 'call-add',
            toolName: 'addDestination',
            type: 'tool-call'
          }
        ],
        [{ text: 'Added Porto to the idea.', type: 'text' }]
      ]
    }),
    modelId: 'test-model'
  } as never);
  const issueId = await trip.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Pack for rain.',
    title: 'Rain gear',
    tripId: trip.sharedTripId
  });
  const runId = await trip.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: issueAgent,
    issueId
  });
  if (!runId) throw new Error('Expected a run');
  await runUntil(trip.owner.test, async () => {
    const run = await trip.owner.test.run((ctx) => ctx.db.get('agentRuns', runId));
    return run?.status === 'complete' || run?.status === 'failed';
  });
  const { events, items, run } = await trip.owner.test.run(async (ctx) => ({
    events: await ctx.db
      .query('agentRunEvents')
      .withIndex('by_runId_and_seq', (query) => query.eq('runId', runId))
      .collect(),
    items: (await ctx.db.query('tripDestinations').collect()).filter(
      (destination) => destination.tripId === trip.tripId
    ),
    run: await ctx.db.get('agentRuns', runId)
  }));
  expect(run).toMatchObject({
    report: 'Added Porto to the idea.',
    status: 'complete'
  });
  expect(events).toContainEqual(
    expect.objectContaining({ kind: 'tool', ok: true, toolName: 'addDestination' })
  );
  expect(items.map((item) => item.name)).toContain('Porto');
});

test('a stale re-claim stops the earlier run and its workflow and the new run owns the reply', async () => {
  vi.useFakeTimers({ toFake: ['clearTimeout', 'setTimeout'] });
  try {
    const { owner, tripId, users } = await setupTrip(1);
    const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
      clientRequestId: crypto.randomUUID(),
      memberUserIds: users.map((user) => user.userId),
      title: 'Reclaim',
      tripId
    });
    const sent = await owner.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: crypto.randomUUID(),
      discussionId,
      text: '@groam hello?'
    });
    const screen = {
      capabilities: [],
      data: '{}',
      description: 'Chat',
      key: `chat:${discussionId}`,
      target: { kind: 'workspace' as const },
      title: 'Reclaim'
    };
    const respond = () =>
      owner.client.action(api.routes.discussions.messages.respond.run, {
        discussionId,
        promptMessageId: sent.messageId,
        screen
      });
    const runs = () =>
      owner.test.run((ctx) =>
        ctx.db
          .query('agentRuns')
          .withIndex('by_discussionId_and_updatedAt', (query) =>
            query.eq('discussionId', discussionId)
          )
          .collect()
      );
    await respond();
    const [first] = await runs();
    if (!first?.workflowId) throw new Error('Expected a workflow-backed run');
    // The first claim goes stale (its client and turn vanished).
    await owner.test.run(async (ctx) => {
      const request = await ctx.db
        .query('discussionMessages')
        .withIndex('by_discussionId_and_agentMessageId', (query) =>
          query.eq('discussionId', discussionId).eq('agentMessageId', sent.messageId)
        )
        .unique();
      if (request) {
        await ctx.db.patch('discussionMessages', request._id, {
          assistantClaimedAt: Date.now() - 11 * 60_000
        });
      }
    });
    await respond();
    const after = await runs();
    const second = after.find((run) => run._id !== first._id);
    expect(after.find((run) => run._id === first._id)?.status).toBe('aborted');
    expect(second).toMatchObject({ status: 'running', workflowId: expect.any(String) });
    expect(
      await owner.test.run((ctx) =>
        getStatus(ctx, components.workflow, first.workflowId as WorkflowId)
      )
    ).toEqual({ type: 'canceled' });
    // The cancelled run's completion must not fail the request the new run is answering.
    await owner.test.mutation(internal.modules.assistant.engine.functions.onComplete, {
      context: { runId: first._id },
      result: { kind: 'canceled' },
      workflowId: first.workflowId as WorkflowId
    });
    const request = await owner.test.run((ctx) =>
      ctx.db
        .query('discussionMessages')
        .withIndex('by_discussionId_and_agentMessageId', (query) =>
          query.eq('discussionId', discussionId).eq('agentMessageId', sent.messageId)
        )
        .unique()
    );
    expect(request?.assistantStatus).toBe('responding');
  } finally {
    vi.useRealTimers();
  }
});

test('onComplete finishes a discussion run whose discussion is gone', async () => {
  const { owner } = await setupTrip(0);
  const runId = await owner.test.run(async (ctx) => {
    const discussionId = await ctx.db.insert('discussions', {
      shortId: 'gone0001',
      clientRequestId: 'req-gone',
      createdBy: { name: 'Owner', userId: owner.userId },
      kind: 'group',
      members: [],
      organizationId: owner.organizationId as string,
      threadId: 'thread-gone',
      title: 'Gone',
      updatedAt: 1
    });
    const id = await ctx.db.insert('agentRuns', {
      agentId: 'groam',
      createdBy: { name: 'Owner', userId: owner.userId },
      discussionId,
      kickoff: 'assign',
      organizationId: owner.organizationId as string,
      promptMessageId: 'msg-gone',
      report: 'Late reply.',
      shortId: 'gonerun1',
      status: 'running',
      surface: 'chat',
      title: 'Gone',
      updatedAt: 1,
      workflowId: 'wf-gone'
    });
    await ctx.db.delete('discussions', discussionId);
    return id;
  });
  await owner.test.mutation(internal.modules.assistant.engine.functions.onComplete, {
    context: { runId },
    result: { kind: 'success', returnValue: { kind: 'done' } },
    workflowId: 'wf-gone' as WorkflowId
  });
  expect(await owner.test.run((ctx) => ctx.db.get('agentRuns', runId))).toMatchObject({
    report: 'Late reply.',
    status: 'complete'
  });
});
