import { vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { WaitCondition } from '#convex/modules/assistant/waits/schema';
import { type Trip, type WaitRunOptions, waitRun } from '#testing/polls';
import { runUntil } from '#testing/workflows';

/** Wait helpers bound to one test file's exported idle workflow (`<module path>:idle`). */
export function waitHelpers(idle: string) {
  const run = (trip: Trip, condition: WaitCondition, options: WaitRunOptions = {}) =>
    waitRun(trip, condition, { ...options, workflow: idle });

  /** The refusal message `AgentWaits.create` gives a fresh run, or '' when it accepts. */
  const refusal = async (trip: Trip, condition: WaitCondition, options: WaitRunOptions = {}) =>
    (await run(trip, condition, options).then(
      () => null,
      (error: unknown) => (error instanceof Error ? error.message : String(error))
    )) ?? '';

  return { refusal, run };
}

export function createIssue(trip: Trip, title: string, rule?: { count: number }) {
  return trip.owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'b',
    ...(rule
      ? { rule: { items: [{ count: rule.count, kind: 'travelers_going' as const }], match: 'all' } }
      : {}),
    title,
    tripId: trip.tripId
  });
}

/**
 * Submits an idea and stops its automatic review, which would otherwise fail later (no ChatGPT
 * connection) and log into another test.
 */
export async function submitIdea(trip: Trip, proposalId: Id<'tripProposals'>) {
  const wasFake = vi.isFakeTimers();
  if (!wasFake) vi.useFakeTimers();
  try {
    await trip.owner.client.action(api.routes.trips.versions.submit.run, { proposalId });
    const run = await trip.owner.client.query(api.routes.agents.runs.proposal.run, { proposalId });
    if (run) await trip.owner.client.mutation(api.routes.agents.runs.stop.run, { runId: run.id });
  } finally {
    if (!wasFake) vi.useRealTimers();
  }
}

/**
 * Membership changes schedule from a Better Auth trigger, which convex-test only runs under fake
 * timers (a real-timer job from a trigger never settles). Run the whole test body in fake time
 * and call `settle` to flush scheduled work, workflows included.
 */
export async function inFakeTime(
  body: (settle: (trip: Trip) => Promise<void>) => Promise<void>
): Promise<void> {
  vi.useFakeTimers();
  try {
    await body(async (trip) => {
      // Waits here resolve by their condition; their deadlines (hours away) must not fire.
      await trip.owner.test.run(async (ctx) => {
        const jobs = await ctx.db.system
          .query('_scheduled_functions')
          .filter((query) => query.eq(query.field('state.kind'), 'pending'))
          .collect();
        for (const job of jobs) {
          if (job.name.includes('waits/functions') && job.name.endsWith(':expire')) {
            await ctx.scheduler.cancel(job._id);
          }
        }
      });
      await trip.owner.test.finishAllScheduledFunctions(vi.runAllTimers);
    });
  } finally {
    vi.useRealTimers();
  }
}

export async function removeMember(trip: Trip, userId: string) {
  const organizationId = trip.owner.organizationId as string;
  const full = await trip.owner.authClient.organization.getFullOrganization({
    query: { organizationId }
  });
  const membership = full.data?.members.find((row) => row.userId === userId);
  if (!membership) throw new Error('Expected the member row');
  const removed = await trip.owner.authClient.organization.removeMember({
    memberIdOrEmail: membership.id,
    organizationId
  });
  if (removed.error) throw new Error(removed.error.message ?? 'Unable to remove member');
}

/**
 * Asks Groam in a new trip chat with every member, answers the turn, and runs workflows until
 * the chat's agent run is waiting. `run` reads the run again.
 */
export async function waitingChatTurn(trip: Trip, text: string) {
  const { owner, tripId, users } = trip;
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: users.map((user) => user.userId),
    title: 'Dinner',
    tripId
  });
  const sent = await owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: crypto.randomUUID(),
    discussionId,
    text
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
  const run = async () =>
    await owner.test.run((ctx) =>
      ctx.db
        .query('agentRuns')
        .withIndex('by_discussionId_and_updatedAt', (query) =>
          query.eq('discussionId', discussionId)
        )
        .first()
    );
  await runUntil(owner.test, async () => (await run())?.status === 'waiting');
  return { discussionId, run, sent };
}
