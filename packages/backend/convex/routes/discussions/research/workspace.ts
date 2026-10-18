import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { Research } from '#convex/modules/discussions/research/index';
import { ResearchValidators } from '#convex/modules/discussions/research/schema';

/** Recent research across the group's visible trips, newest activity first (at most 8). */
export const run = workspaceQuery({
  args: {},
  returns: v.array(ResearchValidators.workspaceItem),
  handler: (ctx) => Research.listForWorkspace(ctx, ctx.workspace)
});
