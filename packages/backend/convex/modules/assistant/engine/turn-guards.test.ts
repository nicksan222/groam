import { mockModel } from '@convex-dev/agent';
import { expectConsole } from '@groam/vitest-config/console';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { setupTrip } from '#testing/trips';

// The turn action runs the real Agent loop against a deterministic provider.
vi.useRealTimers();
afterEach(() => vi.restoreAllMocks());

type Trip = Awaited<ReturnType<typeof setupTrip>>;

const chatScreen = {
  capabilities: [],
  data: '{}',
  description: 'Chat',
  key: 'workspace:home',
  target: { kind: 'workspace' as const },
  title: 'Chat'
};

async function insertRun(trip: Trip, extra: Partial<Doc<'agentRuns'>> = {}) {
  return await trip.owner.test.run((ctx) =>
    ctx.db.insert('agentRuns', {
      actorTokenIdentifier: 'issuer|owner',
      agentId: 'issue',
      createdBy: { name: 'Owner', userId: trip.owner.userId },
      kickoff: 'assign',
      organizationId: trip.owner.organizationId as string,
      shortId: `turn${Math.random().toString(36).slice(2, 6)}`,
      status: 'queued',
      surface: 'standalone',
      title: 'Turn',
      tripId: trip.tripId,
      updatedAt: Date.now(),
      ...extra
    })
  );
}

/** A queued issue run with no workflow, so only the turn under test touches it. */
async function issueRun() {
  const trip = await setupTrip(0);
  const issueId = await trip.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Check back on flights tomorrow.',
    title: 'Flight prices',
    tripId: trip.tripId
  });
  const runId = await insertRun(trip, { issueId });
  return { ...trip, runId };
}

const runTurn = (
  trip: Trip,
  args: {
    resume?: { reason: 'cancelled' | 'deadline' | 'met'; waitId: string };
    runId: Id<'agentRuns'>;
  }
) => trip.owner.test.action(internal.modules.assistant.engine.turn.run, args);

const readRun = (trip: Trip, runId: Id<'agentRuns'>) =>
  trip.owner.test.run((ctx) => ctx.db.get('agentRuns', runId));

/** The provider stops the run (as its creator would) before the model answers. */
function stopDuringProviderLookup(
  trip: Trip & { runId: Id<'agentRuns'> },
  then: () => ReturnType<typeof mockModel>
) {
  vi.spyOn(AssistantProvider, 'configured').mockImplementation(async () => {
    await trip.owner.client.mutation(api.routes.agents.runs.stop.run, { runId: trip.runId });
    return { languageModel: then(), modelId: 'test-model' } as never;
  });
}

test('a stopped run is never claimed for a turn', { timeout: 15_000 }, async () => {
  const trip = await setupTrip(0);
  const runId = await insertRun(trip, { status: 'aborted' });
  await expect(runTurn(trip, { runId })).resolves.toEqual({ kind: 'aborted' });
  expect((await readRun(trip, runId))?.turns).toBeUndefined();
});

test.each([
  ['no thread or screen', {}],
  ['a thread but no discussion', { screen: chatScreen, threadId: 'thread-no-discussion' }]
])(
  'a chat run with %s fails as missing its prompt',
  { timeout: 15_000 },
  async (_, extra: Partial<Doc<'agentRuns'>>) => {
    expectConsole('error', 'discussion assistant respond failed');
    const trip = await setupTrip(0);
    const runId = await insertRun(trip, { agentId: 'groam', surface: 'chat', ...extra });
    await expect(runTurn(trip, { runId })).resolves.toEqual({
      error: 'Discussion run is missing its prompt',
      kind: 'failed'
    });
  }
);

test('a first chat turn without a stored request fails as missing its prompt', async () => {
  expectConsole('error', 'discussion assistant respond failed');
  const trip = await setupTrip(0);
  const discussionId = await trip.owner.test.run((ctx) =>
    ctx.db.insert('discussions', {
      clientRequestId: 'req-no-prompt',
      createdBy: { name: 'Owner', userId: trip.owner.userId },
      kind: 'group',
      members: [],
      organizationId: trip.owner.organizationId as string,
      shortId: 'noprompt',
      threadId: 'thread-no-prompt',
      title: 'No prompt',
      updatedAt: 1
    })
  );
  const runId = await insertRun(trip, {
    agentId: 'groam',
    discussionId,
    screen: chatScreen,
    surface: 'chat',
    threadId: 'thread-no-prompt'
  });
  await expect(runTurn(trip, { runId })).resolves.toEqual({
    error: 'Discussion run is missing its prompt',
    kind: 'failed'
  });
});

test('a standalone run without an issue or idea fails as missing a target', async () => {
  expectConsole('error', 'standalone agent run failed');
  const trip = await setupTrip(0);
  const runId = await insertRun(trip);
  await expect(runTurn(trip, { runId })).resolves.toEqual({
    error: 'Standalone run is missing a target',
    kind: 'failed'
  });
});

test(
  'a resumed turn whose wait has no stored outcome wakes with the reason alone',
  { timeout: 15_000 },
  async () => {
    const model = mockModel({ content: [{ text: 'Prices held; booked.', type: 'text' }] });
    const generate = vi.spyOn(model, 'doGenerate');
    vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
      languageModel: model,
      modelId: 'test-model'
    } as never);
    const trip = await issueRun();
    const waitId = await trip.owner.test.run((ctx) =>
      ctx.db.insert('agentWaits', {
        condition: { kind: 'timer' },
        deadlineAt: Date.now() + 60_000,
        eventId: 'event-unresolved',
        kind: 'timer',
        organizationId: trip.owner.organizationId as string,
        refId: 'timer',
        runId: trip.runId,
        status: 'waiting',
        workflowId: 'wf-unresolved'
      })
    );
    await expect(
      runTurn(trip, { resume: { reason: 'met', waitId }, runId: trip.runId })
    ).resolves.toEqual({ kind: 'done' });
    expect(JSON.stringify(generate.mock.calls[0]?.[0].prompt)).toContain(
      'Wait met. Continue the task.'
    );
    expect((await readRun(trip, trip.runId))?.report).toBe('Prices held; booked.');
  }
);

test('a stop during a resumed turn writes no report', { timeout: 15_000 }, async () => {
  const trip = await issueRun();
  stopDuringProviderLookup(trip, () =>
    mockModel({ content: [{ text: 'Should not be saved.', type: 'text' }] })
  );
  await expect(runTurn(trip, { runId: trip.runId })).resolves.toEqual({ kind: 'aborted' });
  const run = await readRun(trip, trip.runId);
  expect(run?.status).toBe('aborted');
  expect(run?.report).toBeUndefined();
});

test(
  'a turn that fails after a stop reports aborted, not failed',
  { timeout: 15_000 },
  async () => {
    const trip = await issueRun();
    stopDuringProviderLookup(trip, () =>
      mockModel({ content: [{ text: 'Partial', type: 'text' }], fail: true })
    );
    // No "standalone agent run failed" log: a stopped run is not a failure.
    await expect(runTurn(trip, { runId: trip.runId })).resolves.toEqual({ kind: 'aborted' });
    const run = await readRun(trip, trip.runId);
    expect(run?.status).toBe('aborted');
    expect(run?.error).toBeUndefined();
  }
);
