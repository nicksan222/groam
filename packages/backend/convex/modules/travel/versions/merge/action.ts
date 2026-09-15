import { ConvexError, v } from 'convex/values';
import { internalWorkspaceAction } from '#convex/modules/auth/workspace';
import { IdeaErrors } from '#convex/modules/travel/versions/errors';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ActionCtx } from '#convex-generated/server';

export async function runApprovedMerge(
  ctx: ActionCtx,
  proposalId: Id<'tripProposals'>
): Promise<'applied' | 'conflicted'> {
  const prepared = await ctx.runMutation(internal.modules.travel.versions.workflow.prepareMerge, {
    proposalId
  });
  try {
    const history = await ctx.runAction(
      internal.modules.travel.versions.git.action.createHistory,
      prepared.history
    );
    if (!(history.tipCommit && history.mergeCommit && history.mergedSnapshot)) {
      throw new Error('Unable to apply this idea to the shared trip');
    }
    await ctx.runMutation(internal.modules.travel.versions.workflow.finishMerge, {
      baseCommit: history.baseCommit,
      mergeCommit: history.mergeCommit,
      mergedSnapshot: history.mergedSnapshot,
      proposalId,
      tipCommit: history.tipCommit,
      token: prepared.token
    });
    return 'applied';
  } catch (error: unknown) {
    const detail = error instanceof ConvexError ? error.data : null;
    if (
      detail &&
      typeof detail === 'object' &&
      'code' in detail &&
      detail.code === 'trip_merge_conflict' &&
      'paths' in detail &&
      Array.isArray(detail.paths) &&
      detail.paths.every((path: unknown): path is string => typeof path === 'string')
    ) {
      await ctx.runMutation(internal.modules.travel.versions.workflow.markConflict, {
        paths: detail.paths,
        proposalId,
        token: prepared.token
      });
      return 'conflicted';
    }
    await ctx.runMutation(internal.modules.travel.versions.workflow.cancelOperation, {
      proposalId,
      token: prepared.token
    });
    return IdeaErrors.rethrow(error);
  }
}

export const apply = internalWorkspaceAction({
  args: { proposalId: v.id('tripProposals') },
  returns: v.union(v.literal('applied'), v.literal('conflicted')),
  handler: async (ctx, { proposalId }) => await runApprovedMerge(ctx, proposalId)
});
