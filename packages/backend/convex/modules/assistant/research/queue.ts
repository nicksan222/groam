import { ConvexError } from 'convex/values';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import { AgentEngine } from '#convex/modules/assistant/engine/index';
import { requireWorkspace, type Workspace } from '#convex/modules/auth/workspace';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import { MAX_RESEARCH_TOPIC_LENGTH } from '#convex/modules/discussions/threads/lengths';
import { insertWithShortId } from '#convex/modules/references/index';
import { loadTripContext } from '#convex/modules/travel/trips/ctx';

export type ResearchTask = { topic: string; effort: 'quick' | 'standard' | 'deep' };

export function researchTopic(topic: string): string {
  const normalized = topic.trim();
  if (!normalized || normalized.length > MAX_RESEARCH_TOPIC_LENGTH) {
    throw new ConvexError(
      `Research topics must be between 1 and ${MAX_RESEARCH_TOPIC_LENGTH} characters`
    );
  }
  return normalized;
}

async function assertParent(
  ctx: MutationCtx,
  parentRunId: Id<'agentRuns'> | undefined,
  workspace: Workspace
) {
  if (!parentRunId) return;
  const parent = await ctx.db.get('agentRuns', parentRunId);
  if (
    parent?.status !== 'running' ||
    parent.organizationId !== workspace.organizationId ||
    parent.createdBy.userId !== workspace.userId
  )
    throw new ConvexError('Parent agent run is not active for this user');
  const children = await ctx.db
    .query('agentRuns')
    .withIndex('by_researchTask_parentRunId', (q) => q.eq('researchTask.parentRunId', parentRunId))
    .take(3);
  if (children.length >= 3)
    throw new ConvexError('This agent run has reached its research delegation budget');
}

/** Authorizes and queues one bounded research task as the initiating person. */
export async function queueResearch(
  ctx: MutationCtx,
  args: ResearchTask & {
    tripId: Id<'trips'>;
    discussionId?: Id<'discussions'>;
    start: boolean;
    sourceRunId?: Id<'agentRuns'>;
  }
): Promise<Id<'agentRuns'>> {
  const workspace = await requireWorkspace(ctx);
  const topic = researchTopic(args.topic);
  const parentRunId = args.sourceRunId ?? workspace.runId;
  await assertParent(ctx, parentRunId, workspace);
  const { trip } = await loadTripContext(ctx, args.tripId, workspace);
  if (trip.archive !== undefined) throw new ConvexError('This trip is archived');
  if (args.discussionId) {
    const access = await DiscussionAccess.forWorkspace(ctx, args.discussionId, workspace);
    if (access.discussion.kind !== 'research' || access.discussion.tripId !== trip._id) {
      throw new ConvexError('Research not found');
    }
    access.assertWritable();
    // One task per research page, even when two viewers click together.
    const active = await Promise.all(
      ['queued', 'running', 'waiting'].map((status) =>
        ctx.db
          .query('agentRuns')
          .withIndex('by_discussionId_and_status_and_updatedAt', (q) =>
            q
              .eq('discussionId', args.discussionId)
              .eq('status', status as 'queued' | 'running' | 'waiting')
          )
          .take(20)
      )
    );
    const existing = active.flat().find((run) => run.researchTask !== undefined);
    if (existing) return existing._id;
    await access.markSeen(ctx, Date.now());
  }
  await aiRateLimiter.limit(ctx, 'tripAssistantMessage', {
    key: workspace.tokenIdentifier,
    throws: true
  });
  const runId = await insertWithShortId(ctx, 'agentRuns', {
    actorTokenIdentifier: workspace.tokenIdentifier,
    agentId: 'researcher',
    createdBy: { name: workspace.viewerName, userId: workspace.userId },
    ...(args.discussionId ? { discussionId: args.discussionId } : {}),
    kickoff: 'assign',
    organizationId: workspace.organizationId,
    researchTask: {
      topic,
      effort: args.effort,
      ...(parentRunId ? { parentRunId } : {})
    },
    status: 'queued',
    surface: 'standalone',
    title: topic.slice(0, 160),
    tripId: trip._id,
    updatedAt: Date.now()
  });
  if (args.start) await AgentEngine.start(ctx, runId);
  return runId;
}
