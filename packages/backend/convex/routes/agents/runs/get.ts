import { v } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentRunValidators } from '#convex/modules/assistant/runs/schema';
import { workspaceQuery } from '#convex/modules/auth/workspace';

export const run = workspaceQuery({
  args: { runId: v.id('agentRuns') },
  returns: AgentRunValidators.run,
  handler: (ctx, { runId }) => AgentRuns.getRun(ctx, runId)
});
