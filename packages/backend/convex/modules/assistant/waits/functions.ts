import { ConvexError, v } from 'convex/values';
import { internalMutation, internalQuery } from '#convex-generated/server';
import { conditionLabel } from '#convex/modules/assistant/waits/conditions/index';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { AgentWaitValidators } from '#convex/modules/assistant/waits/schema';
import { internalWorkspaceMutation } from '#convex/modules/auth/workspace';

/** Scheduled at the deadline. A no-op once the wait resolved another way. */
export const expire = internalMutation({
  args: { waitId: v.id('agentWaits') },
  returns: v.null(),
  handler: async (ctx, { waitId }) => {
    await AgentWaits.expire(ctx, waitId);
    return null;
  }
});

/** The next page of a `signal` whose first batch was full. */
export const signal = internalMutation({
  args: {
    after: v.number(),
    deleted: v.boolean(),
    kind: AgentWaitValidators.kind,
    refId: v.string()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await AgentWaits.signal(ctx, args);
    return null;
  }
});

/** `waitFor`: the calling run waits. Only a run actor (`asRun`) has a run to suspend. */
export const createForRun = internalWorkspaceMutation({
  args: { condition: AgentWaitValidators.condition, deadlineAt: v.number() },
  returns: v.object({
    eventId: v.string(),
    status: v.union(v.literal('met'), v.literal('waiting')),
    waitId: v.id('agentWaits')
  }),
  handler: async (ctx, { condition, deadlineAt }) => {
    const runId = ctx.workspace.runId;
    if (!runId) throw new ConvexError('Only an agent run can wait');
    return await AgentWaits.create(ctx, { condition, deadlineAt, runId });
  }
});

/** `cancelWait`: the run's own wait, or a pending wait of another run in the same discussion. */
export const cancelForRun = internalWorkspaceMutation({
  args: { waitId: v.id('agentWaits') },
  returns: v.null(),
  handler: async (ctx, { waitId }) => {
    const runId = ctx.workspace.runId;
    if (!runId) throw new ConvexError('Only an agent run can cancel a wait');
    const [wait, current] = await Promise.all([
      ctx.db.get('agentWaits', waitId),
      ctx.db.get('agentRuns', runId)
    ]);
    const owner = wait ? await ctx.db.get('agentRuns', wait.runId) : null;
    const sameRun = wait?.runId === runId;
    const sameThread =
      current?.discussionId !== undefined && owner?.discussionId === current.discussionId;
    if (!wait || !(sameRun || sameThread)) throw new ConvexError('Wait not found');
    await AgentWaits.cancel(ctx, { notify: true, reason: 'cancelled by the agent', waitId });
    return null;
  }
});

/** Pending waits of other runs in the discussion behind an agent thread (prompt guidance). */
export const pendingForThread = internalQuery({
  args: { threadId: v.string(), viewerUserId: v.optional(v.string()) },
  returns: v.array(AgentWaitValidators.view),
  handler: async (ctx, { threadId, viewerUserId }) => {
    const discussion = await ctx.db
      .query('discussions')
      .withIndex('by_threadId', (query) => query.eq('threadId', threadId))
      .unique();
    if (!discussion) return [];
    // Prompt guidance for a sender without a seat on a wait's trip never carries its details.
    const viewer = viewerUserId
      ? { organizationId: discussion.organizationId, userId: viewerUserId }
      : undefined;
    return await AgentWaits.pendingForDiscussion(ctx, discussion._id, viewer);
  }
});

/** What a resumed turn tells the model: kind, label, and the stored outcome. */
export const resumeContext = internalQuery({
  args: { waitId: v.id('agentWaits') },
  returns: v.union(
    v.object({
      kind: AgentWaitValidators.kind,
      label: v.string(),
      outcome: v.union(AgentWaitValidators.outcome, v.null())
    }),
    v.null()
  ),
  handler: async (ctx, { waitId }) => {
    const wait = await ctx.db.get('agentWaits', waitId);
    if (!wait) return null;
    return {
      kind: wait.kind,
      label: await conditionLabel(ctx, wait.condition),
      outcome: wait.outcome ?? null
    };
  }
});
