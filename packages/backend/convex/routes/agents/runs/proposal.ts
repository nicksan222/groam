import { v } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentRunValidators } from '#convex/modules/assistant/runs/schema';
import { workspaceQuery } from '#convex/modules/auth/workspace';

export const run = workspaceQuery({
  args: { proposalId: v.id('tripProposals') },
  returns: v.union(AgentRunValidators.run, v.null()),
  handler: (ctx, { proposalId }) => AgentRuns.latestProposalRun(ctx, proposalId)
});
