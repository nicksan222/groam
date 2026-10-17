import { v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { workspaceAction } from '#convex/modules/auth/workspace';

/**
 * Starts a queued standalone run's workflow (a run that already has one is left alone). Stays
 * an action so shipped clients keep calling it; the work is one mutation.
 */
export const run = workspaceAction({
  args: { runId: v.id('agentRuns') },
  returns: v.null(),
  handler: async (ctx, { runId }): Promise<null> =>
    await ctx.runMutation(internal.modules.assistant.engine.functions.startStandalone, { runId })
});
