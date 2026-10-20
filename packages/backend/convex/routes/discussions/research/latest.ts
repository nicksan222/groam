import { ConvexError, v } from 'convex/values';
import { query } from '#convex-generated/server';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentRunValidators } from '#convex/modules/assistant/runs/schema';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';

export const run = query({
  args: { discussionId: v.id('discussions') },
  returns: v.union(AgentRunValidators.run, v.null()),
  handler: async (ctx, { discussionId }) => {
    const access = await DiscussionAccess.require(ctx, discussionId);
    if (access.discussion.kind !== 'research') throw new ConvexError('Research not found');
    const runs = await ctx.db
      .query('agentRuns')
      .withIndex('by_discussionId_and_updatedAt', (q) => q.eq('discussionId', discussionId))
      .order('desc')
      .take(25);
    const latest = runs.find((candidate) => candidate.researchTask !== undefined);
    return latest ? AgentRuns.presentRun(latest) : null;
  }
});
