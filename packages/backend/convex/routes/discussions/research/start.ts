import { ConvexError, v } from 'convex/values';
import { mutation } from '#convex-generated/server';
import { queueResearch } from '#convex/modules/assistant/research/queue';
import { researchEffortValidator } from '#convex/modules/assistant/runs/schema';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';

export const run = mutation({
  args: { discussionId: v.id('discussions'), topic: v.string(), effort: researchEffortValidator },
  returns: v.id('agentRuns'),
  handler: async (ctx, args) => {
    const access = await DiscussionAccess.require(ctx, args.discussionId);
    if (access.discussion.kind !== 'research') throw new ConvexError('Research not found');
    return queueResearch(ctx, { ...args, tripId: access.discussion.tripId, start: true });
  }
});
