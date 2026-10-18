import { v } from 'convex/values';
import { internalQuery } from '#convex-generated/server';
import { loadRunActor } from '#convex/modules/auth/workspace';

const runActor = v.object({
  organizationId: v.string(),
  tokenIdentifier: v.string(),
  userId: v.string(),
  viewerName: v.string()
});

/** Action-side lookup for `requireActor` (actions have no `ctx.db`). */
export const load = internalQuery({
  args: { runId: v.id('agentRuns') },
  returns: v.union(runActor, v.null()),
  handler: (ctx, { runId }) => loadRunActor(ctx, runId)
});
