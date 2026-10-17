import { mockModel } from '@convex-dev/agent';
import { getStatus, listSteps, type WorkflowId } from '@convex-dev/workflow';
import { expectConsole } from '@groam/vitest-config/console';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, components, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { RECONNECT_CHATGPT_LABEL } from '#convex/modules/assistant/engine/schema';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentRunTracking } from '#convex/modules/assistant/runs/tracking';
import { StandaloneSession } from '#convex/modules/assistant/standalone/index';
import { timerCondition } from '#convex/modules/assistant/waits/conditions/timer';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { setupTrip } from '#testing/trips';
import { waitingChatTurn } from '#testing/waits';
import { isParked, runUntil } from '#testing/workflows';

// Runs advance through workflow steps on scheduled functions.
vi.useRealTimers();
afterEach(() => vi.restoreAllMocks());

function waitThenReply(reply: string) {
  return mockModel({
    contentSteps: [
      [
        {
          input: JSON.stringify({ condition: { kind: 'timer' }, deadlineHours: 2 }),
          toolCallId: 'wait-1',
          toolName: 'waitFor',
          type: 'tool-call' as const
        }
      ],
      [{ text: reply, type: 'text' as const }]
    ]
  });
}

async function issueRun() {
  const trip = await setupTrip(0);
  const issueId = await trip.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Check back on flights tomorrow.',
    title: 'Flight prices',
    tripId: trip.tripId
  });
  const runId = await trip.owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' },
    issueId
  });
  if (!runId) throw new Error('Expected a run');
  const read = () => trip.owner.test.run((ctx) => ctx.db.get('agentRuns', runId));
  return { ...trip, read, runId };
}

async function waitingRun() {
  const trip = await issueRun();
  await runUntil(trip.owner.test, async () => await isParked(trip.owner.test, await trip.read()));
  const waiting = await trip.read();
  return { ...trip, waitId: waiting?.activeWaitId as Id<'agentWaits'>, waiting };
}

test(
  'a timer wait suspends the run and its deadline resumes the same run',
  { timeout: 20_000 },
  async () => {
    vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
      languageModel: waitThenReply('Prices dropped; booked.'),
      modelId: 'm'
    } as never);
    const trip = await waitingRun();
    expect(trip.waiting).toMatchObject({ headline: 'Waiting for a timer', status: 'waiting' });
    await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, {
      waitId: trip.waitId
    });
    await runUntil(trip.owner.test, async () => (await trip.read())?.status === 'complete');
    const done = await trip.read();
    expect(done).toMatchObject({ report: 'Prices dropped; booked.', status: 'complete' });
    expect(done?.activeWaitId).toBeUndefined();
    const steps = await trip.owner.test.run((ctx) =>
      listSteps(ctx, components.workflow, trip.waiting?.workflowId as WorkflowId)
    );
    // Review Focus 1: the journal shape a resumed run replays.
    expect(steps.page.map((step) => step.kind)).toEqual(['function', 'event', 'function']);
    expect(steps.page[0]?.name).toBe('modules/assistant/engine/turn:run');
    expect(steps.page[2]?.name).toBe('modules/assistant/engine/turn:run');
  }
);

test(
  'a resume with a disconnected ChatGPT fails the run with a reconnect event',
  { timeout: 20_000 },
  async () => {
    expectConsole('error', 'standalone agent run failed');
    const configured = vi.spyOn(AssistantProvider, 'configured');
    configured.mockResolvedValueOnce({
      languageModel: waitThenReply('unused'),
      modelId: 'm'
    } as never);
    configured.mockRejectedValue(
      new Error('Connect ChatGPT in Settings → AI to use your ChatGPT plan.')
    );
    const trip = await waitingRun();
    await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, {
      waitId: trip.waitId
    });
    await runUntil(trip.owner.test, async () => (await trip.read())?.status === 'failed');
    expect((await trip.read())?.error).toBe(RECONNECT_CHATGPT_LABEL);
    const events = await trip.owner.test.run((ctx) =>
      ctx.db
        .query('agentRunEvents')
        .withIndex('by_runId_and_seq', (query) => query.eq('runId', trip.runId))
        .collect()
    );
    expect(events.map((event) => event.label)).toContain(RECONNECT_CHATGPT_LABEL);
  }
);

test(
  'stopping a waiting run cancels its wait without resuming it',
  { timeout: 20_000 },
  async () => {
    vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
      languageModel: waitThenReply('unused'),
      modelId: 'm'
    } as never);
    const trip = await waitingRun();
    await trip.owner.client.mutation(api.routes.agents.runs.stop.run, { runId: trip.runId });
    await runUntil(
      trip.owner.test,
      async () =>
        (
          await trip.owner.test.run((ctx) =>
            getStatus(ctx, components.workflow, trip.waiting?.workflowId as WorkflowId)
          )
        ).type !== 'inProgress'
    );
    const stopped = await trip.read();
    expect(stopped?.status).toBe('aborted');
    expect(stopped?.report).not.toBe('unused');
    const wait = await trip.owner.test.run((ctx) => ctx.db.get('agentWaits', trip.waitId));
    expect(wait).toMatchObject({ outcome: { reason: 'cancelled' }, status: 'cancelled' });
    // The deadline firing later is a no-op on the stopped run.
    await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, {
      waitId: trip.waitId
    });
    expect((await trip.read())?.status).toBe('aborted');
  }
);

test('a waiting run is never swept as stale', { timeout: 20_000 }, async () => {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: waitThenReply('unused'),
    modelId: 'm'
  } as never);
  const trip = await waitingRun();
  // Long after every stale threshold: only runs no workflow owns are swept.
  const swept = await trip.owner.test.run((ctx) =>
    AgentRuns.failStaleRuns(ctx, Date.now() + 24 * 60 * 60 * 1000)
  );
  expect(swept).toBe(0);
  expect((await trip.read())?.status).toBe('waiting');
});

async function waitingChat(reply: string) {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: waitThenReply(reply),
    modelId: 'm'
  } as never);
  const trip = await setupTrip(1);
  const turn = await waitingChatTurn(trip, '@groam check back on dinner in two hours');
  return { ...turn, owner: trip.owner };
}

test(
  'a chat turn that waits answers its request, then its resumed reply becomes the last message',
  { timeout: 20_000 },
  async () => {
    const { discussionId, owner, run, sent } = await waitingChat('Two hours later: sushi it is.');
    const request = await owner.test.run((ctx) =>
      ctx.db
        .query('discussionMessages')
        .withIndex('by_discussionId_and_agentMessageId', (query) =>
          query.eq('discussionId', discussionId).eq('agentMessageId', sent.messageId)
        )
        .unique()
    );
    expect(request?.assistantStatus).toBe('complete');
    const waiting = await run();
    expect(waiting?.promptMessageId).toBeUndefined();
    const lastMessage = async () =>
      (await owner.client.query(api.routes.discussions.list.run, {})).find(
        (item) => item.id === discussionId
      )?.lastMessage?.text;
    expect(await lastMessage()).toBe('Waiting for a timer.');
    await owner.test.mutation(internal.modules.assistant.waits.functions.expire, {
      waitId: waiting?.activeWaitId as Id<'agentWaits'>
    });
    await runUntil(owner.test, async () => (await run())?.status === 'complete');
    expect(await run()).toMatchObject({ report: 'Two hours later: sushi it is.' });
    expect(await lastMessage()).toBe('Two hours later: sushi it is.');
  }
);

test('deleting a chat stops its waiting run and closes the wait', { timeout: 20_000 }, async () => {
  const { discussionId, owner, run } = await waitingChat('unused');
  const waitId = (await run())?.activeWaitId as Id<'agentWaits'>;
  await owner.test.mutation(internal.modules.discussions.threads.cleanup.purgeDiscussion, {
    discussionId
  });
  await runUntil(
    owner.test,
    async () => (await owner.test.run((ctx) => ctx.db.get('discussions', discussionId))) === null
  );
  expect(await run()).toMatchObject({ status: 'aborted' });
  expect((await owner.test.run((ctx) => ctx.db.get('agentWaits', waitId)))?.status).toBe(
    'cancelled'
  );
});

test(
  'deleting a trip stops its waiting issue run and closes the wait',
  { timeout: 20_000 },
  async () => {
    vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
      languageModel: waitThenReply('unused'),
      modelId: 'm'
    } as never);
    const trip = await waitingRun();
    const issueGone = async () =>
      (await trip.owner.test.run((ctx) =>
        ctx.db
          .query('tripIssues')
          .withIndex('by_tripId_and_updatedAt', (query) => query.eq('tripId', trip.tripId))
          .first()
      )) === null;
    // Group deletion removes the trip in batches: conversations, then issues.
    await trip.owner.test.mutation(internal.modules.organizations.cleanup.removeOrganizationData, {
      organizationId: trip.owner.organizationId as string
    });
    await runUntil(trip.owner.test, issueGone);
    // Let the cascade and the cancelled workflow settle before the next test starts.
    await runUntil(
      trip.owner.test,
      async () =>
        (await trip.owner.test.run((ctx) => ctx.db.get('trips', trip.tripId))) === null &&
        (
          await trip.owner.test.run((ctx) =>
            getStatus(ctx, components.workflow, trip.waiting?.workflowId as WorkflowId)
          )
        ).type !== 'inProgress'
    );
    expect((await trip.read())?.status).toBe('aborted');
    expect(
      (await trip.owner.test.run((ctx) => ctx.db.get('agentWaits', trip.waitId)))?.status
    ).toBe('cancelled');
  }
);

test('a waiting issue run logs no report until it resumes', { timeout: 20_000 }, async () => {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: waitThenReply('Prices dropped.'),
    modelId: 'm'
  } as never);
  const trip = await waitingRun();
  const labels = async () =>
    (
      await trip.owner.test.run((ctx) =>
        ctx.db
          .query('agentRunEvents')
          .withIndex('by_runId_and_seq', (query) => query.eq('runId', trip.runId))
          .collect()
      )
    ).map((event) => event.label);
  expect(await labels()).not.toContain('Report ready');
  expect(trip.waiting?.report ?? '').toBe('');
  await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, {
    waitId: trip.waitId
  });
  await runUntil(trip.owner.test, async () => (await trip.read())?.status === 'complete');
  expect((await labels()).filter((label) => label === 'Report ready')).toHaveLength(1);
});

test(
  'a turn that fails after waitFor ends the run and closes the wait without resuming',
  { timeout: 20_000 },
  async () => {
    expectConsole('error', 'standalone agent run failed');
    vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
      languageModel: waitThenReply('unused'),
      modelId: 'm'
    } as never);
    // The turn runs waitFor for real, then breaks before it can suspend.
    const turn = StandaloneSession.turn;
    vi.spyOn(StandaloneSession, 'turn').mockImplementation(async (ctx, run, note) => {
      await turn(ctx, run, note);
      throw new Error('report store down');
    });
    const trip = await issueRun();
    await runUntil(trip.owner.test, async () => (await trip.read())?.status === 'failed');
    const failed = await trip.read();
    const waits = await trip.owner.test.run((ctx) =>
      ctx.db
        .query('agentWaits')
        .withIndex('by_runId', (query) => query.eq('runId', trip.runId))
        .collect()
    );
    expect(waits).toHaveLength(1);
    expect(waits[0]).toMatchObject({
      outcome: { reason: 'cancelled', summary: 'Cancelled: the run ended' },
      status: 'cancelled'
    });
    const steps = await trip.owner.test.run((ctx) =>
      listSteps(ctx, components.workflow, failed?.workflowId as WorkflowId)
    );
    expect(steps.page.map((step) => step.kind)).toEqual(['function']);
  }
);

test(
  'a wait met before the turn suspends resumes the run at once',
  { timeout: 20_000 },
  async () => {
    vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
      languageModel: waitThenReply('Already decided.'),
      modelId: 'm'
    } as never);
    vi.spyOn(timerCondition, 'judge').mockReturnValueOnce({
      met: true,
      progress: null,
      snapshot: { kind: 'timer' },
      summary: 'Already met'
    });
    const trip = await issueRun();
    await runUntil(trip.owner.test, async () => (await trip.read())?.status === 'complete');
    const done = await trip.read();
    expect(done?.report).toBe('Already decided.');
    const steps = await trip.owner.test.run((ctx) =>
      listSteps(ctx, components.workflow, done?.workflowId as WorkflowId)
    );
    expect(steps.page.map((step) => step.kind)).toEqual(['function', 'event', 'function']);
  }
);

test(
  'a wait cancelled before the turn suspends resumes the run at once',
  { timeout: 20_000 },
  async () => {
    vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
      languageModel: waitThenReply('Wrapped up.'),
      modelId: 'm'
    } as never);
    const recordStep = AgentRunTracking.recordStep;
    const trip = await issueRun();
    // Cancel the wait the moment its step is recorded, before the turn returns and suspends.
    vi.spyOn(AgentRunTracking, 'recordStep').mockImplementation(async (ctx, runId, step) => {
      await recordStep(ctx, runId, step);
      const current = await trip.owner.test.run((db) => db.db.get('agentRuns', runId));
      const waitId = current?.activeWaitId;
      if (waitId) {
        await trip.owner.test.run((db) =>
          AgentWaits.cancel(db, { notify: true, reason: 'decided early', waitId })
        );
      }
    });
    await runUntil(trip.owner.test, async () => (await trip.read())?.status === 'complete');
    const done = await trip.read();
    expect(done?.report).toBe('Wrapped up.');
    const steps = await trip.owner.test.run((ctx) =>
      listSteps(ctx, components.workflow, done?.workflowId as WorkflowId)
    );
    expect(steps.page.map((step) => step.kind)).toEqual(['function', 'event', 'function']);
  }
);
