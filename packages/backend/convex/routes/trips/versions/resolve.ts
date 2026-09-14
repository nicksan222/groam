import { v } from 'convex/values';
import { workspaceAction } from '#convex/modules/auth/workspace';
import { IdeaErrors } from '#convex/modules/travel/versions/errors';
import { internal } from '#convex-generated/api';

export const run = workspaceAction({
  args: {
    proposalId: v.id('tripProposals'),
    resolutions: v.array(
      v.object({
        choice: v.union(v.literal('current'), v.literal('proposed')),
        path: v.string()
      })
    )
  },
  returns: v.null(),
  handler: async (ctx, { proposalId, resolutions }) => {
    const prepared = await ctx.runMutation(
      internal.modules.travel.versions.workflow.prepareResolution,
      { proposalId, resolutions }
    );
    try {
      const history = await ctx.runAction(
        internal.modules.travel.versions.git.action.createHistory,
        prepared.history
      );
      if (!(history.tipCommit && history.mergeCommit && history.mergedSnapshot)) {
        throw new Error('Unable to resolve and apply this idea');
      }
      await ctx.runMutation(internal.modules.travel.versions.workflow.finishMerge, {
        baseCommit: history.baseCommit,
        mergeCommit: history.mergeCommit,
        mergedSnapshot: history.mergedSnapshot,
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
