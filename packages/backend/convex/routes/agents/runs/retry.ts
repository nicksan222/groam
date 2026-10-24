import { v } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { workspaceMutation } from '#convex/modules/auth/workspace';

export const run = workspaceMutation({
  args: { runId: v.id('agentRuns') },
  returns: v.id('agentRuns'),
  handler: (ctx, { runId }) => AgentRuns.retryIssueRun(ctx, runId)
});
