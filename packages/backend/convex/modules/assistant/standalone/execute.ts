import { v } from 'convex/values';
import { StandaloneSession } from '#convex/modules/assistant/standalone/session';
import { internalAction } from '#convex-generated/server';

/** Scheduled Issue-agent kickoff. Has no user identity — load targets by document id. */
export const run = internalAction({
  args: { runId: v.id('agentRuns') },
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    await StandaloneSession.execute(ctx, runId);
    return null;
  }
});
