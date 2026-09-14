import { v } from 'convex/values';
import { workspaceAction } from '#convex/modules/auth/workspace';
import { internal } from '#convex-generated/api';

/** Run the AI reviewer on a submitted proposal; returns a summary and comment count. */
export const run = workspaceAction({
  args: { proposalId: v.id('tripProposals') },
  returns: v.object({ commentCount: v.number(), summary: v.string() }),
  handler: async (ctx, { proposalId }): Promise<{ commentCount: number; summary: string }> =>
    await ctx.runAction(internal.modules.travel.versions.agent.review.action.run, { proposalId })
});
