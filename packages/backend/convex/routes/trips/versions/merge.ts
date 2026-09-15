import { v } from 'convex/values';
import { workspaceAction } from '#convex/modules/auth/workspace';
import { runApprovedMerge } from '#convex/modules/travel/versions/merge/action';

/**
 * Merge an approved idea into the shared trip. On auto-merge failure, records conflict paths
 * on the proposal instead of throwing; otherwise rolls back the in-flight operation.
 */
export const run = workspaceAction({
  args: { proposalId: v.id('tripProposals') },
  returns: v.union(v.literal('applied'), v.literal('conflicted')),
  handler: async (ctx, { proposalId }) => await runApprovedMerge(ctx, proposalId)
});
