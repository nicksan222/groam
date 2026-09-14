import { v } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentRunValidators } from '#convex/modules/assistant/runs/schema';
import { assistantAgentValidator } from '#convex/modules/assistant/validators/index';
import { workspaceQuery } from '#convex/modules/auth/workspace';

export const run = workspaceQuery({
  args: {
    agentId: assistantAgentValidator,
    ...AgentRunValidators.assignedIssueActivity
  },
  returns: v.array(AgentRunValidators.assignedIssue),
  handler: (ctx, { agentId, issueId, proposalId, tripId }) =>
    AgentRuns.assignedIssues(ctx, agentId, { issueId, proposalId, tripId })
});
