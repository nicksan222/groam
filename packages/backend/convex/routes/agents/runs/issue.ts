import { v } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentRunValidators } from '#convex/modules/assistant/runs/schema';
import { workspaceQuery } from '#convex/modules/auth/workspace';

export const run = workspaceQuery({
  args: { issueId: v.id('tripIssues') },
  returns: v.union(AgentRunValidators.run, v.null()),
  handler: (ctx, { issueId }) => AgentRuns.latestIssueRun(ctx, issueId)
});
