import { v } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentRunValidators } from '#convex/modules/assistant/runs/schema';
import { workspaceQuery } from '#convex/modules/auth/workspace';

export const run = workspaceQuery({
  args: {},
  returns: v.array(AgentRunValidators.rosterItem),
  handler: (ctx) => AgentRuns.roster(ctx)
});
