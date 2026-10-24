import { workspaceMutation } from '#convex/modules/auth/workspace';
import { enrichArgs, enrichmentResult, enrichLocalTrip } from '#convex/modules/dev/enrich';

export const run = workspaceMutation({
  args: enrichArgs,
  returns: enrichmentResult,
  handler: (ctx, input) => enrichLocalTrip(ctx, input, ctx.workspace)
});
