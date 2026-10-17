import { start } from '@convex-dev/workflow';
import { type FunctionReference, makeFunctionReference } from 'convex/server';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import type { WaitCondition } from '#convex/modules/assistant/waits/schema';
import type { PollRule } from '#convex/modules/polls/schema';
import type { createAuthenticatedTest } from '#testing/factory';
import type { setupTrip } from '#testing/trips';

export type Owner = Awaited<ReturnType<typeof createAuthenticatedTest>>;
export type Trip = Awaited<ReturnType<typeof setupTrip>>;
const HOUR = 60 * 60 * 1000;
// Exported by `modules/polls/poll-waits.test.ts` (convex-test only finds functions under
// `convex/`, and loading another test file would register its tests twice). Other test files
// export their own `idle` and pass its path.
const POLL_WAITS_IDLE = 'modules/polls/poll-waits.test:idle';

function idleWorkflow(path: string) {
  return makeFunctionReference<'mutation'>(path) as unknown as FunctionReference<
    'mutation',
    'internal'
  >;
}

export async function createTripPoll(
  owner: Owner,
  tripId: Id<'trips'>,
  overrides: Partial<{
    closesAt: number;
    multiSelect: boolean;
    options: string[];
    question: string;
  }> = {}
) {
  return await owner.client.mutation(api.routes.polls.create.run, {
    multiSelect: false,
    options: ['Sushi', 'Tapas'],
    question: 'Where should we eat?',
    tripId,
    ...overrides
  });
}

export type RunFields = {
  createdBy?: { name: string; userId: string };
  discussionId?: Id<'discussions'>;
  organizationId?: string;
  tripId?: Id<'trips'> | null;
};

/**
 * A running Groam run. With `workflow` (true for `poll-waits.test.ts`'s, or another test file's
 * `idle` path), it also gets a real idle workflow so waits have an event target.
 */
export async function insertAgentRun(
  trip: Trip,
  fields: RunFields = {},
  workflow: boolean | string = false
) {
  return await trip.owner.test.run(async (ctx) => {
    const tripId = fields.tripId === undefined ? trip.tripId : fields.tripId;
    const runId = await ctx.db.insert('agentRuns', {
      actorTokenIdentifier: 'issuer|owner',
      agentId: 'groam',
      createdBy: fields.createdBy ?? { name: 'Owner', userId: trip.owner.userId },
      kickoff: 'assign',
      organizationId: fields.organizationId ?? (trip.owner.organizationId as string),
      shortId: `poll${Math.random().toString(36).slice(2, 6)}`,
      status: 'running',
      surface: 'chat',
      title: 'Poll wait',
      ...(tripId ? { tripId } : {}),
      ...(fields.discussionId ? { discussionId: fields.discussionId } : {}),
      updatedAt: Date.now()
    });
    if (workflow) {
      const path = workflow === true ? POLL_WAITS_IDLE : workflow;
      await ctx.db.patch('agentRuns', runId, {
        workflowId: await start(ctx, idleWorkflow(path), {})
      });
    }
    return runId;
  });
}

export type WaitRunOptions = RunFields & { deadlineAt?: number; workflow?: true | string };

/** A run suspended on any wait condition, created through `AgentWaits.create`. */
export async function waitRun(
  trip: Trip,
  condition: WaitCondition,
  { deadlineAt = Date.now() + 24 * HOUR, workflow = true, ...fields }: WaitRunOptions = {}
) {
  const runId = await insertAgentRun(trip, fields, workflow);
  const { waitId } = await trip.owner.test.run((ctx) =>
    AgentWaits.create(ctx, { condition, deadlineAt, runId })
  );
  return {
    runId,
    wait: () => trip.owner.test.run((ctx) => ctx.db.get('agentWaits', waitId)),
    waitId
  };
}

/** A run suspended on a poll wait. */
export async function pollWaitRun(
  trip: Trip,
  pollId: Id<'polls'>,
  rule: PollRule[],
  options: WaitRunOptions = {}
) {
  return await waitRun(trip, { kind: 'poll', pollId, rule }, options);
}

export type Client = Owner['client'];
const firstPage = { cursor: null, numItems: 50 };

/** The first page of a trip's polls with one status. */
export async function tripPolls(
  client: Client,
  tripId: Id<'trips'>,
  status: 'closed' | 'open' = 'open'
) {
  return (
    await client.query(api.routes.polls.list.trip.run, {
      paginationOpts: firstPage,
      status,
      tripId
    })
  ).page;
}

/** The first page of the group's own polls (not tied to a trip) with one status. */
export async function groupPolls(client: Client, status: 'closed' | 'open' = 'open') {
  return (
    await client.query(api.routes.polls.list.workspace.run, { paginationOpts: firstPage, status })
  ).page;
}
