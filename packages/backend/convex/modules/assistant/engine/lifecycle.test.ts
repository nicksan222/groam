import type { WorkflowId } from '@convex-dev/workflow';
import { expectConsole } from '@groam/vitest-config/console';
import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import { RUN_EXHAUSTED_ERROR, RUN_STALLED_ERROR } from '#convex/modules/assistant/engine/schema';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip } from '#testing/trips';

type Trip = Awaited<ReturnType<typeof setupTrip>>;

async function insertRun(trip: Trip, extra: Partial<Doc<'agentRuns'>> = {}) {
  return await trip.owner.test.run((ctx) =>
    ctx.db.insert('agentRuns', {
      actorTokenIdentifier: 'issuer|owner',
      agentId: 'issue',
      createdBy: { name: 'Owner', userId: trip.owner.userId },
      kickoff: 'assign',
      organizationId: trip.owner.organizationId as string,
      shortId: `life${Math.random().toString(36).slice(2, 6)}`,
      status: 'queued',
      surface: 'standalone',
      title: 'Lifecycle',
      tripId: trip.tripId,
      updatedAt: Date.now(),
      ...extra
    })
  );
}

const readRun = (trip: Trip, runId: Id<'agentRuns'>) =>
  trip.owner.test.run((ctx) => ctx.db.get('agentRuns', runId));

/** Spends the caller's whole assistant-message bucket through the real rate limiter. */
async function exhaustMessageBudget(trip: Trip) {
  await trip.owner.client.run(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Expected an identity');
    await aiRateLimiter.limit(ctx, 'tripAssistantMessage', {
      count: 6,
      key: identity.tokenIdentifier
    });
  });
}

test('the monitor start refuses a run from another group', { timeout: 15_000 }, async () => {
  const trip = await setupTrip(0);
  const runId = await insertRun(trip);
  const outsider = await createOutsiderClient(trip.owner.test);
  await expect(outsider.client.action(api.routes.agents.runs.start.run, { runId })).rejects.toThrow(
    'Agent run not found'
  );
  expect((await readRun(trip, runId))?.workflowId).toBeUndefined();
});

test('the monitor start refuses chat runs', { timeout: 15_000 }, async () => {
  const trip = await setupTrip(0);
  const runId = await insertRun(trip, { agentId: 'groam', surface: 'chat' });
  await expect(
    trip.owner.client.action(api.routes.agents.runs.start.run, { runId })
  ).rejects.toThrow('Only standalone runs start from the agent monitor');
});

test('the monitor start leaves a run that already has a workflow alone', async () => {
  const trip = await setupTrip(0);
  const runId = await insertRun(trip, { workflowId: 'wf-existing' });
  // A run with a workflow never spends rate-limit budget either.
  await exhaustMessageBudget(trip);
  await expect(
    trip.owner.client.action(api.routes.agents.runs.start.run, { runId })
  ).resolves.toBeNull();
  expect((await readRun(trip, runId))?.workflowId).toBe('wf-existing');
});

test('a rate-limited monitor start reports friendly copy and starts nothing', async () => {
  const trip = await setupTrip(0);
  const runId = await insertRun(trip);
  await exhaustMessageBudget(trip);
  await expect(
    trip.owner.client.action(api.routes.agents.runs.start.run, { runId })
  ).rejects.toThrow(/Too many messages\. Try again in \d+ minutes?\./);
  expect(await readRun(trip, runId)).toMatchObject({ status: 'queued' });
  expect((await readRun(trip, runId))?.workflowId).toBeUndefined();
});

test('a failed workflow fails its run with the stalled copy', async () => {
  expectConsole('error', 'agent run workflow failed');
  const trip = await setupTrip(0);
  const runId = await insertRun(trip, { status: 'running', workflowId: 'wf-failed' });
  await trip.owner.test.mutation(internal.modules.assistant.engine.functions.onComplete, {
    context: { runId },
    result: { error: 'step crashed', kind: 'failed' },
    workflowId: 'wf-failed' as WorkflowId
  });
  expect(await readRun(trip, runId)).toMatchObject({
    error: RUN_STALLED_ERROR,
    status: 'failed'
  });
});

test('a run that used every turn fails with the exhausted copy', async () => {
  const trip = await setupTrip(0);
  const runId = await insertRun(trip, {
    report: 'Partial work.',
    status: 'running',
    workflowId: 'wf-exhausted'
  });
  await trip.owner.test.mutation(internal.modules.assistant.engine.functions.onComplete, {
    context: { runId },
    result: { kind: 'success', returnValue: { kind: 'exhausted' } },
    workflowId: 'wf-exhausted' as WorkflowId
  });
  const run = await readRun(trip, runId);
  expect(run).toMatchObject({ error: RUN_EXHAUSTED_ERROR, status: 'failed' });
});

test('onComplete ignores a run that no longer exists', async () => {
  const trip = await setupTrip(0);
  const runId = await insertRun(trip, { status: 'running', workflowId: 'wf-gone' });
  await trip.owner.test.run((ctx) => ctx.db.delete('agentRuns', runId));
  await expect(
    trip.owner.test.mutation(internal.modules.assistant.engine.functions.onComplete, {
      context: { runId },
      result: { kind: 'success', returnValue: { kind: 'done' } },
      workflowId: 'wf-gone' as WorkflowId
    })
  ).resolves.toBeNull();
});
