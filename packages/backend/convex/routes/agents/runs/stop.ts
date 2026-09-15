import { v } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { workspaceMutation } from '#convex/modules/auth/workspace';

export const run = workspaceMutation({
  args: { runId: v.id('agentRuns') },
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    await AgentRuns.getRun(ctx, runId);
    await AgentRuns.finish(ctx, { runId, status: 'aborted' });
    return null;
  }
});
