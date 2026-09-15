import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { seedWorkspaceTripArgs, seedWorkspaceTrips } from '#convex/modules/dev/trips';

export const run = workspaceMutation({
  args: seedWorkspaceTripArgs,
  returns: v.array(v.id('trips')),
  handler: async (ctx, { plans }) => await seedWorkspaceTrips(ctx, plans, ctx.workspace)
});
