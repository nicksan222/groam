import { v } from 'convex/values';
import { workspaceAction } from '#convex/modules/auth/workspace';
import { IdeaErrors } from '#convex/modules/travel/versions/errors';
import { internal } from '#convex-generated/api';

/**
 * Submit a draft trip idea for review: snapshots the working trip, writes git history,
 * and transitions the proposal to `in_review`. Author-only; rolls back on failure.
 */
export const run = workspaceAction({
  args: { proposalId: v.id('tripProposals') },
  returns: v.null(),
  handler: async (ctx, { proposalId }) => {
    const prepared = await ctx.runMutation(
      internal.modules.travel.versions.workflow.prepareSubmit,
      {
        proposalId
      }
    );
    try {
      const history = await ctx.runAction(
        internal.modules.travel.versions.git.action.createHistory,
        prepared.history
      );
      if (!history.tipCommit) throw new Error('Unable to share change history for this idea');
      await ctx.runMutation(internal.modules.travel.versions.workflow.finishSubmit, {
        baseCommit: history.baseCommit,
        proposalId,
        tipCommit: history.tipCommit,
        token: prepared.token
      });
      return null;
    } catch (error: unknown) {
      await ctx.runMutation(internal.modules.travel.versions.workflow.cancelOperation, {
        proposalId,
        token: prepared.token
      });
      IdeaErrors.rethrow(error);
    }
  }
});
