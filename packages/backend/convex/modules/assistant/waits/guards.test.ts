import { expectConsole } from '@groam/vitest-config/console';
import { expect, test, vi } from 'vite-plus/test';
import { internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import { timerCondition } from '#convex/modules/assistant/waits/conditions/timer';
import { setupTrip } from '#testing/trips';

type Trip = Awaited<ReturnType<typeof setupTrip>>;

async function insertRun(trip: Trip, extra: Partial<Doc<'agentRuns'>> = {}) {
  return await trip.owner.test.run((ctx) =>
    ctx.db.insert('agentRuns', {
      actorTokenIdentifier: 'issuer|owner',
      agentId: 'groam',
      createdBy: { name: 'Owner', userId: trip.owner.userId },
      kickoff: 'assign',
      organizationId: trip.owner.organizationId as string,
      shortId: `grd${Math.random().toString(36).slice(2, 7)}`,
      status: 'running',
      surface: 'chat',
      title: 'Guard',
      updatedAt: Date.now(),
      workflowId: 'wf-guard',
      ...extra
    })
  );
}

async function insertWait(
  trip: Trip,
  runId: Id<'agentRuns'>,
  extra: Partial<Doc<'agentWaits'>> = {}
) {
  return await trip.owner.test.run((ctx) =>
    ctx.db.insert('agentWaits', {
      condition: { kind: 'timer' },
      deadlineAt: Date.now() + 60 * 60_000,
      eventId: 'event-missing',
      kind: 'timer',
      organizationId: trip.owner.organizationId as string,
      refId: 'timer',
      runId,
      status: 'waiting',
      workflowId: 'wf-guard',
      ...extra
    })
  );
}

async function insertDiscussion(trip: Trip, threadId: string) {
  return await trip.owner.test.run((ctx) =>
    ctx.db.insert('discussions', {
      clientRequestId: `req-${threadId}`,
      createdBy: { name: 'Owner', userId: trip.owner.userId },
      kind: 'group',
      members: [],
      organizationId: trip.owner.organizationId as string,
      shortId: threadId.slice(0, 8),
      threadId,
      title: 'Waits',
      updatedAt: 1
    })
  );
}

test('a signed-in person is not a run and cannot wait or cancel waits', async () => {
  const trip = await setupTrip(0);
  const runId = await insertRun(trip);
  const waitId = await insertWait(trip, runId);
  await expect(
    trip.owner.client.mutation(internal.modules.assistant.waits.functions.createForRun, {
      condition: { kind: 'timer' },
      deadlineAt: Date.now() + 60_000
    })
  ).rejects.toThrow('Only an agent run can wait');
  await expect(
    trip.owner.client.mutation(internal.modules.assistant.waits.functions.cancelForRun, {
      waitId
    })
  ).rejects.toThrow('Only an agent run can cancel a wait');
  expect(await trip.owner.test.run((ctx) => ctx.db.get('agentWaits', waitId))).toMatchObject({
    status: 'waiting'
  });
});

test('a run cannot cancel a wait that is gone or belongs to another chat', async () => {
  const trip = await setupTrip(0);
  const runId = await insertRun(trip);
  const gone = await insertWait(trip, runId);
  await trip.owner.test.run((ctx) => ctx.db.delete('agentWaits', gone));
  await expect(
    trip.owner.test.mutation(internal.modules.assistant.waits.functions.cancelForRun, {
      asRun: runId,
      waitId: gone
    })
  ).rejects.toThrow('Wait not found');

  const otherRunId = await insertRun(trip, { status: 'waiting' });
  const foreign = await insertWait(trip, otherRunId);
  await expect(
    trip.owner.test.mutation(internal.modules.assistant.waits.functions.cancelForRun, {
      asRun: runId,
      waitId: foreign
    })
  ).rejects.toThrow('Wait not found');
});

test('resume context is null for a missing wait and carries a stored outcome', async () => {
  const trip = await setupTrip(0);
  const runId = await insertRun(trip);
  const resolved = await insertWait(trip, runId, {
    outcome: {
      progress: null,
      reason: 'met',
      snapshot: { kind: 'timer' },
      summary: 'Timer elapsed'
    },
    status: 'met'
  });
  await expect(
    trip.owner.test.query(internal.modules.assistant.waits.functions.resumeContext, {
      waitId: resolved
    })
  ).resolves.toMatchObject({
    kind: 'timer',
    outcome: { reason: 'met', summary: 'Timer elapsed' }
  });
  await trip.owner.test.run((ctx) => ctx.db.delete('agentWaits', resolved));
  await expect(
    trip.owner.test.query(internal.modules.assistant.waits.functions.resumeContext, {
      waitId: resolved
    })
  ).resolves.toBeNull();
});

test('pending waits skip runs whose active wait already resolved', async () => {
  const trip = await setupTrip(0);
  const discussionId = await insertDiscussion(trip, 'thread-pending-waits');
  const waitingRunId = await insertRun(trip, { discussionId, status: 'waiting' });
  const pendingWaitId = await insertWait(trip, waitingRunId);
  const staleRunId = await insertRun(trip, { discussionId, status: 'waiting' });
  const resolvedWaitId = await insertWait(trip, staleRunId, { status: 'met' });
  const noWaitRunId = await insertRun(trip, { discussionId, status: 'waiting' });
  await trip.owner.test.run(async (ctx) => {
    await ctx.db.patch('agentRuns', waitingRunId, { activeWaitId: pendingWaitId });
    await ctx.db.patch('agentRuns', staleRunId, { activeWaitId: resolvedWaitId });
  });
  const pending = await trip.owner.test.query(
    internal.modules.assistant.waits.functions.pendingForThread,
    { threadId: 'thread-pending-waits' }
  );
  expect(pending).toEqual([
    expect.objectContaining({ id: pendingWaitId, runId: waitingRunId, status: 'waiting' })
  ]);
  expect(pending.some((wait) => wait.runId === noWaitRunId)).toBe(false);
  await expect(
    trip.owner.test.query(internal.modules.assistant.waits.functions.pendingForThread, {
      threadId: 'thread-unknown'
    })
  ).resolves.toEqual([]);
});

test('a wait whose event cannot be delivered fails its run instead of stranding it', async () => {
  expectConsole('error', 'agent wait event not delivered');
  expectConsole('error', 'agent wait workflow not cancelled');
  const trip = await setupTrip(0);
  const runId = await insertRun(trip, { status: 'waiting' });
  const waitId = await insertWait(trip, runId);
  await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, { waitId });
  expect(await trip.owner.test.run((ctx) => ctx.db.get('agentWaits', waitId))).toMatchObject({
    outcome: { reason: 'deadline' },
    status: 'expired'
  });
  expect(await trip.owner.test.run((ctx) => ctx.db.get('agentRuns', runId))).toMatchObject({
    error: 'The run could not resume after its wait. Try again.',
    status: 'failed'
  });
  // Resolution is idempotent: a second deadline does nothing.
  await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, { waitId });
});

test('a run that ends closes its wait without re-reading the watched entity', async () => {
  const trip = await setupTrip(0);
  const runId = await insertRun(trip, { status: 'waiting' });
  const waitId = await insertWait(trip, runId);
  const closed = await trip.owner.test.run(async (ctx) => {
    const { AgentWaits } = await import('#convex/modules/assistant/waits/index');
    return await AgentWaits.cancel(ctx, { notify: false, reason: 'the run ended', waitId });
  });
  expect(closed).toBe(true);
  const wait = await trip.owner.test.run((ctx) => ctx.db.get('agentWaits', waitId));
  expect(wait).toMatchObject({
    outcome: { progress: null, reason: 'cancelled', summary: 'Cancelled: the run ended' },
    status: 'cancelled'
  });
  expect(wait?.outcome?.snapshot).toBeUndefined();
});

test('cancelling still resolves the wait when its snapshot cannot be read', async () => {
  expectConsole('error', 'agent wait snapshot failed on cancel');
  expectConsole('error', 'agent wait event not delivered');
  expectConsole('error', 'agent wait workflow not cancelled');
  const trip = await setupTrip(0);
  const runId = await insertRun(trip, { status: 'waiting' });
  const waitId = await insertWait(trip, runId);
  vi.spyOn(timerCondition, 'load').mockRejectedValueOnce(new Error('too many reads'));
  await trip.owner.test.run(async (ctx) => {
    const { AgentWaits } = await import('#convex/modules/assistant/waits/index');
    await AgentWaits.cancel(ctx, { notify: true, reason: 'cancelled by a traveler', waitId });
  });
  const wait = await trip.owner.test.run((ctx) => ctx.db.get('agentWaits', waitId));
  expect(wait).toMatchObject({
    outcome: { reason: 'cancelled', summary: 'Cancelled: cancelled by a traveler' },
    status: 'cancelled'
  });
  expect(wait?.outcome?.snapshot).toBeUndefined();
});
