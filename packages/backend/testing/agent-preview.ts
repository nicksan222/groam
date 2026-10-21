import { assistantAgentList } from '@groam/ai/agents';
import type { Id } from '#convex-generated/dataModel';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { insertWithShortId } from '#convex/modules/references/index';
import type { createTest } from '#testing/factory';

/** Queue a real discussion run without executing an external model provider. */
export function queuePreviewDiscussionRun(
  test: ReturnType<typeof createTest>,
  args: { threadId: string; userId: string; organizationId: string }
) {
  return test.run(async (ctx) => {
    // Legacy owner-audience discussions remain supported by the access policy.
    const discussionId = await insertWithShortId(ctx, 'discussions', {
      clientRequestId: crypto.randomUUID(),
      kind: 'assistant',
      createdBy: { name: 'Owner', userId: args.userId },
      organizationId: args.organizationId,
      threadId: args.threadId,
      title: 'Private owner conversation',
      updatedAt: Date.now()
    });
    return AgentRuns.queueDiscussionTurn(ctx, {
      agentId: 'groam',
      createdBy: { name: 'Owner', userId: args.userId },
      discussionId,
      organizationId: args.organizationId,
      threadId: args.threadId,
      title: 'Protected queued conversation'
    });
  });
}

/** Historical schema-valid runs may link any agent to a private working-copy conversation. */
export async function seedRosterAuthorizationWindows(
  test: ReturnType<typeof createTest>,
  args: { seedRunId: Id<'agentRuns'>; workingTripId: Id<'trips'>; countPerAgent: number }
) {
  const seed = await test.run(async (ctx) => {
    const run = await ctx.db.get('agentRuns', args.seedRunId);
    if (!run?.discussionId) throw new Error('Expected a discussion run');
    const discussion = await ctx.db.get('discussions', run.discussionId);
    if (discussion?.kind !== 'group') throw new Error('Expected a group chat');
    const { _id: _runId, _creationTime: _runTime, ...runFields } = run;
    const { _id: _chatId, _creationTime: _chatTime, ...chatFields } = discussion;
    return { runFields, chatFields };
  });
  for (const agent of assistantAgentList) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Keep each historical fixture batch bounded to one agent's window.
    await test.run(async (ctx) => {
      await Promise.all(
        Array.from({ length: args.countPerAgent }, async () => {
          const discussionId = await insertWithShortId(ctx, 'discussions', {
            ...seed.chatFields,
            tripId: args.workingTripId,
            clientRequestId: crypto.randomUUID()
          });
          await insertWithShortId(ctx, 'agentRuns', {
            ...seed.runFields,
            agentId: agent.id,
            surface: agent.surface,
            discussionId
          });
        })
      );
    });
  }
}

/** Distinct inaccessible issue trips defeat the roster's per-trip visibility cache. */
export async function seedRosterIssueSources(
  test: ReturnType<typeof createTest>,
  sourceTripId: Id<'trips'>
) {
  await test.run(async (ctx) => {
    const trip = await ctx.db.get('trips', sourceTripId);
    const issue = await ctx.db
      .query('tripIssues')
      .withIndex('by_tripId_and_updatedAt', (q) => q.eq('tripId', sourceTripId))
      .first();
    if (!trip || !issue) throw new Error('Expected a trip with starter issues');
    const { _id: _tripId, _creationTime: _tripTime, ...tripFields } = trip;
    const { _id: _issueId, _creationTime: _issueTime, ...issueFields } = issue;
    await Promise.all(
      Array.from({ length: 500 }, async () => {
        const tripId = await insertWithShortId(ctx, 'trips', tripFields);
        await insertWithShortId(ctx, 'tripIssues', { ...issueFields, tripId });
      })
    );
  });
}
