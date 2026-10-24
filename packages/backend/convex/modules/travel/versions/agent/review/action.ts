import { ConvexError, v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { internalAction } from '#convex-generated/server';
import { AgentTurns } from '#convex/modules/assistant/engine/turns';

/** Run the standalone idea reviewer and persist comments + a workspace-visible agent run. */
export const run = internalAction({
  args: { proposalId: v.id('tripProposals') },
  returns: v.object({
    commentCount: v.number(),
    inProgress: v.optional(v.boolean()),
    summary: v.string()
  }),
  handler: async (
    ctx,
    { proposalId }
  ): Promise<{ commentCount: number; inProgress?: boolean; summary: string }> => {
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
    // Runs in this action so the caller gets the review back; never through a workflow.
    const result = await AgentTurns.runInline(ctx, runId);
    if (result) return result;
    // Not claimed: another review of this idea is already queued or running (or just finished).
    const stored = await ctx.runQuery(internal.modules.assistant.runs.functions.getInternal, {
      runId
    });
    if (stored?.status === 'queued' || stored?.status === 'running') {
      return {
        commentCount: 0,
        inProgress: true,
        summary: 'A review of this idea is in progress.'
      };
    }
    if (stored?.status === 'complete') {
      return { commentCount: 0, summary: stored.report ?? 'Review complete.' };
    }
    throw new ConvexError(stored?.error ?? 'The idea review did not complete.');
  }
});
