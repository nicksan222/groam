import { cancel, createEvent, getStatus, start, type WorkflowId } from '@convex-dev/workflow';
import { type FunctionReference, makeFunctionReference } from 'convex/server';
import { expect, test, vi } from 'vite-plus/test';
import { api, components, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { agentWorkflow } from '#convex/modules/assistant/engine/manager';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { setupTrip } from '#testing/trips';
import { runUntil } from '#testing/workflows';

vi.useRealTimers();

const HOUR = 60 * 60 * 1000;

// oxlint-disable-next-line jest/no-export -- convex-test discovers test-only functions through module exports.
export const idle = agentWorkflow.define({ args: {} }).handler(async (step): Promise<void> => {
  // Parks without a scheduled step, so cancelling it leaves no late step completion behind.
  await step.awaitEvent({ name: 'never' });
});
// Test files are not in the generated api; address the test workflow by path.
const idleWorkflow = makeFunctionReference<'mutation'>(
  'modules/assistant/waits/waits.test:idle'
) as unknown as FunctionReference<'mutation', 'internal'>;

type Trip = Awaited<ReturnType<typeof setupTrip>>;

/** A run mid-turn with a real (idle) workflow so createEvent/sendEvent have a target. */
async function insertRun(trip: Trip, extra: { discussionId?: Id<'discussions'> } = {}) {
  return await trip.owner.test.run(async (ctx) => {
    const id = await ctx.db.insert('agentRuns', {
      actorTokenIdentifier: 'issuer|owner',
      agentId: extra.discussionId ? 'groam' : 'issue',
      createdBy: { name: 'Owner', userId: trip.owner.userId },
      kickoff: 'assign',
      organizationId: trip.owner.organizationId as string,
      shortId: `wait${Math.random().toString(36).slice(2, 6)}`,
      status: 'running',
      surface: extra.discussionId ? 'chat' : 'standalone',
      title: 'Wait',
      tripId: trip.tripId,
      updatedAt: Date.now(),
      ...extra
    });
    const workflowId = await start(ctx, idleWorkflow, {});
    await ctx.db.patch('agentRuns', id, { workflowId });
    return id;
  });
}

async function runningWorkflowRun() {
  const trip = await setupTrip(0);
  return { ...trip, runId: await insertRun(trip) };
}

type WaitingRun = Awaited<ReturnType<typeof runningWorkflowRun>>;

async function createTimer(trip: WaitingRun, deadlineAt: number) {
  return await trip.owner.test.run((ctx) =>
    AgentWaits.create(ctx, { condition: { kind: 'timer' }, deadlineAt, runId: trip.runId })
  );
}

async function readWait(trip: WaitingRun, waitId: Parameters<typeof AgentWaits.expire>[1]) {
  return await trip.owner.test.run((ctx) => ctx.db.get('agentWaits', waitId));
}

test('a timer wait needs a deadline in the next 14 days', { timeout: 15_000 }, async () => {
  const trip = await runningWorkflowRun();
  await expect(createTimer(trip, Date.now() - 1)).rejects.toThrow('deadline in the future');
  await expect(createTimer(trip, Date.now() + 15 * 24 * HOUR)).rejects.toThrow('at most 14 days');
  const created = await createTimer(trip, Date.now() + HOUR);
  expect(created.status).toBe('waiting');
  await trip.owner.test.run(async (ctx) => {
    expect((await ctx.db.get('agentRuns', trip.runId))?.activeWaitId).toBe(created.waitId);
    const jobs = await ctx.db.system.query('_scheduled_functions').collect();
    expect(
      jobs.some(
        (job) =>
          job.name.includes('waits/functions') &&
          (job.args[0] as { waitId?: string } | undefined)?.waitId === created.waitId
      )
    ).toBe(true);
  });
});

test('a run can hold only one active wait', { timeout: 15_000 }, async () => {
  const trip = await runningWorkflowRun();
  await createTimer(trip, Date.now() + HOUR);
  await expect(createTimer(trip, Date.now() + HOUR)).rejects.toThrow('already waiting');
});

test('only a running workflow run can wait', { timeout: 15_000 }, async () => {
  const trip = await runningWorkflowRun();
  await trip.owner.test.run((ctx) => ctx.db.patch('agentRuns', trip.runId, { status: 'queued' }));
  await expect(createTimer(trip, Date.now() + HOUR)).rejects.toThrow(
    'Only a running agent run can wait'
  );
});

test(
  'the deadline expires a waiting timer once; a second expiry is a no-op',
  { timeout: 15_000 },
  async () => {
    const trip = await runningWorkflowRun();
    const { waitId } = await createTimer(trip, Date.now() + HOUR);
    await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, { waitId });
    const first = await readWait(trip, waitId);
    await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, { waitId });
    const second = await readWait(trip, waitId);
    expect(second).toMatchObject({
      outcome: { reason: 'deadline', summary: 'Timer elapsed' },
      status: 'expired'
    });
    expect(second?.resolvedAt).toBe(first?.resolvedAt);
  }
);

test(
  'a resolved wait stays resolved: cancel after expiry and expiry after cancel are no-ops',
  { timeout: 15_000 },
  async () => {
    const trip = await runningWorkflowRun();
    const { waitId } = await createTimer(trip, Date.now() + HOUR);
    await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, { waitId });
    await expect(
      trip.owner.test.run((ctx) => AgentWaits.cancel(ctx, { notify: true, reason: 'late', waitId }))
    ).resolves.toBe(false);
    expect((await readWait(trip, waitId))?.status).toBe('expired');
  }
);

test(
  'cancel resolves with cancelled; a signal for another ref touches nothing',
  { timeout: 15_000 },
  async () => {
    const trip = await runningWorkflowRun();
    const { waitId } = await createTimer(trip, Date.now() + HOUR);
    const resolved = await trip.owner.test.run((ctx) =>
      AgentWaits.signal(ctx, { kind: 'timer', refId: 'other' })
    );
    expect(resolved).toBe(0);
    await trip.owner.test.run((ctx) =>
      AgentWaits.cancel(ctx, { notify: true, reason: 'No longer needed', waitId })
    );
    expect(await readWait(trip, waitId)).toMatchObject({
      outcome: { reason: 'cancelled', summary: 'Cancelled: No longer needed' },
      status: 'cancelled'
    });
    await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, { waitId });
    expect((await readWait(trip, waitId))?.status).toBe('cancelled');
  }
);

test(
  'a wait on a finished workflow stays resolved when the event cannot be delivered',
  { timeout: 15_000 },
  async () => {
    const trip = await runningWorkflowRun();
    const { waitId } = await createTimer(trip, Date.now() + HOUR);
    const run = await trip.owner.test.run((ctx) => ctx.db.get('agentRuns', trip.runId));
    await trip.owner.test.run((ctx) => cancel(ctx, components.workflow, run?.workflowId as never));
    await trip.owner.test.mutation(internal.modules.assistant.waits.functions.expire, { waitId });
    expect((await readWait(trip, waitId))?.status).toBe('expired');
    const status = await trip.owner.test.run((ctx) =>
      getStatus(ctx, components.workflow, run?.workflowId as never)
    );
    expect(status.type).toBe('canceled');
  }
);

test(
  'the tool entry point refuses callers that are not an agent run',
  { timeout: 15_000 },
  async () => {
    const trip = await runningWorkflowRun();
    await expect(
      trip.owner.client.mutation(internal.modules.assistant.waits.functions.createForRun, {
        condition: { kind: 'timer' },
        deadlineAt: Date.now() + HOUR
      })
    ).rejects.toThrow('Only an agent run can wait');
  }
);

test('a run keeps its last turn to resume from a wait', { timeout: 15_000 }, async () => {
  const trip = await runningWorkflowRun();
  await trip.owner.test.run((ctx) => ctx.db.patch('agentRuns', trip.runId, { turns: 25 }));
  await expect(createTimer(trip, Date.now() + HOUR)).rejects.toThrow('no turns left');
  await trip.owner.test.run((ctx) => ctx.db.patch('agentRuns', trip.runId, { turns: 24 }));
  await expect(createTimer(trip, Date.now() + HOUR)).resolves.toMatchObject({
    status: 'waiting'
  });
});

test(
  'cancelWait reaches a wait in the same chat, not one in another chat',
  { timeout: 20_000 },
  async () => {
    const trip = await setupTrip(1);
    const chat = () =>
      trip.owner.client.mutation(api.routes.discussions.create.run, {
        clientRequestId: crypto.randomUUID(),
        memberUserIds: trip.users.map((user) => user.userId),
        title: 'Dinner',
        tripId: trip.tripId
      });
    const [here, elsewhere] = [await chat(), await chat()];
    const waitingRunId = await insertRun(trip, { discussionId: here });
    const { waitId } = await trip.owner.test.run((ctx) =>
      AgentWaits.create(ctx, {
        condition: { kind: 'timer' },
        deadlineAt: Date.now() + HOUR,
        runId: waitingRunId
      })
    );
    await trip.owner.test.run((ctx) =>
      ctx.db.patch('agentRuns', waitingRunId, { status: 'waiting' })
    );
    const outsiderRun = await insertRun(trip, { discussionId: elsewhere });
    await expect(
      trip.owner.test.mutation(internal.modules.assistant.waits.functions.cancelForRun, {
        asRun: outsiderRun,
        waitId
      })
    ).rejects.toThrow('Wait not found');
    expect((await trip.owner.test.run((ctx) => ctx.db.get('agentWaits', waitId)))?.status).toBe(
      'waiting'
    );
    const neighbourRun = await insertRun(trip, { discussionId: here });
    await trip.owner.test.mutation(internal.modules.assistant.waits.functions.cancelForRun, {
      asRun: neighbourRun,
      waitId
    });
    expect(await trip.owner.test.run((ctx) => ctx.db.get('agentWaits', waitId))).toMatchObject({
      outcome: { reason: 'cancelled', summary: 'Cancelled: cancelled by the agent' },
      status: 'cancelled'
    });
  }
);

test('a signal reaches every waiting wait, past the first batch', { timeout: 30_000 }, async () => {
  const trip = await runningWorkflowRun();
  const run = await trip.owner.test.run((ctx) => ctx.db.get('agentRuns', trip.runId));
  const total = 60;
  await trip.owner.test.run(async (ctx) => {
    for (let index = 0; index < total; index++) {
      const eventId = await createEvent(ctx, components.workflow, {
        name: `wait:${index}`,
        workflowId: run?.workflowId as WorkflowId
      });
      await ctx.db.insert('agentWaits', {
        condition: { kind: 'timer' },
        deadlineAt: Date.now() + HOUR,
        eventId,
        kind: 'timer',
        organizationId: run?.organizationId as string,
        refId: 'watched',
        runId: trip.runId,
        status: 'waiting',
        workflowId: run?.workflowId as string
      });
    }
  });
  const first = await trip.owner.test.run((ctx) =>
    AgentWaits.signal(ctx, { deleted: true, kind: 'timer', refId: 'watched' })
  );
  expect(first).toBe(50);
  const waitingCount = () =>
    trip.owner.test.run(
      async (ctx) =>
        (
          await ctx.db
            .query('agentWaits')
            .withIndex('by_kind_and_refId_and_status', (query) =>
              query.eq('kind', 'timer').eq('refId', 'watched').eq('status', 'waiting')
            )
            .collect()
        ).length
    );
  await runUntil(trip.owner.test, async () => (await waitingCount()) === 0);
});
