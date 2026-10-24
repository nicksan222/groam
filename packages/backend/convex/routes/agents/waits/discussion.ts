import { v } from 'convex/values';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { AgentWaitValidators } from '#convex/modules/assistant/waits/schema';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';

/** Runs in this chat suspended on a wait. */
export const run = workspaceQuery({
  args: { discussionId: v.id('discussions') },
  returns: v.array(AgentWaitValidators.view),
  handler: async (ctx, { discussionId }) => {
    await DiscussionAccess.forWorkspace(ctx, discussionId, ctx.workspace);
    return await AgentWaits.pendingForDiscussion(ctx, discussionId, ctx.workspace);
  }
});
