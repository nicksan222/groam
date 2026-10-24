import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentRunValidators } from '#convex/modules/assistant/runs/schema';
import { assistantAgentValidator } from '#convex/modules/assistant/validators/index';
import { workspaceQuery } from '#convex/modules/auth/workspace';

export const run = workspaceQuery({
  args: { agentId: assistantAgentValidator },
  returns: AgentRunValidators.rosterItem,
  handler: (ctx, { agentId }) => AgentRuns.getAgent(ctx, agentId)
});
