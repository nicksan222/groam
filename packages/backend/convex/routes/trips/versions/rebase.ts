import { type Infer, v } from 'convex/values';
import { workspaceAction } from '#convex/modules/auth/workspace';
import { detailRebaseValidator } from '#convex/modules/travel/versions/detailrebase';
import { IdeaErrors } from '#convex/modules/travel/versions/errors';
import {
  type versionPrepareRebaseResultValidator,
  versionRebaseResultValidator
} from '#convex/modules/travel/versions/validators';
import { internal } from '#convex-generated/api';

/**
 * Rebase an idea onto the latest shared trip. Compatible updates combine
 * automatically; remaining conflicts are returned for step-by-step choices.
 */
type PreparedRebase = Infer<typeof versionPrepareRebaseResultValidator>;
type VersionRebaseResult = Infer<typeof versionRebaseResultValidator>;

export const run = workspaceAction({
  args: {
    details: v.optional(detailRebaseValidator),
    proposalId: v.id('tripProposals'),
    resolutions: v.array(
      v.object({
        choice: v.union(v.literal('current'), v.literal('proposed')),
        path: v.string()
      })
    )
  },
  returns: versionRebaseResultValidator,
  handler: async (ctx, { details, proposalId, resolutions }): Promise<VersionRebaseResult> => {
    const prepared: PreparedRebase = await ctx.runMutation(
      internal.modules.travel.versions.workflow.prepareRebase,
      {
        details,
        proposalId,
        resolutions
      }
    );
    if (prepared.kind === 'needs_choices') {
      return { conflicts: prepared.conflicts, kind: 'needs_choices' as const };
    }
    if (prepared.kind === 'noop') return { kind: 'applied' as const };
    try {
      const history = await ctx.runAction(
        internal.modules.travel.versions.git.action.createHistory,
        prepared.history
      );
      if (!history.tipCommit) throw new Error('Unable to rebase this idea onto the shared trip');
      await ctx.runMutation(internal.modules.travel.versions.workflow.finishRebase, {
        baseCommit: history.baseCommit,
        baseSnapshot: prepared.history.base.snapshot,
        proposalId,
        rebasedSnapshot: prepared.rebasedSnapshot,
        tipCommit: history.tipCommit,
        token: prepared.token
      });
      return { kind: 'applied' as const };
    } catch (error: unknown) {
      await ctx.runMutation(internal.modules.travel.versions.workflow.cancelOperation, {
        proposalId,
        token: prepared.token
      });
      return IdeaErrors.rethrow(error);
    }
  }
});
