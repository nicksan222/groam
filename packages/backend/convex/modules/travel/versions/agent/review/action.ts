import { v } from 'convex/values';
import { StandaloneSession } from '#convex/modules/assistant/standalone/index';
import { internal } from '#convex-generated/api';
import { internalAction } from '#convex-generated/server';

/** Run the standalone idea reviewer and persist comments + a workspace-visible agent run. */
export const run = internalAction({
  args: { proposalId: v.id('tripProposals') },
  returns: v.object({ commentCount: v.number(), summary: v.string() }),
  handler: async (ctx, { proposalId }): Promise<{ commentCount: number; summary: string }> => {
    const context = await ctx.runQuery(
      internal.modules.travel.versions.agent.review.index.context,
      { proposalId }
    );
    const runId = await ctx.runMutation(
      internal.modules.assistant.runs.functions.queueReviewForViewer,
      {
        proposalId,
        title: context.title,
        tripId: context.sourceTripId
      }
    );
    const result = await StandaloneSession.execute(ctx, runId);
    if (!result) return { commentCount: 0, summary: 'Review did not complete.' };
    return result;
  }
});
