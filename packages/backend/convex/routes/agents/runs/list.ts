import {
  type PaginationOptions,
  paginationOptsValidator,
  paginationResultValidator
} from 'convex/server';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentRunValidators } from '#convex/modules/assistant/runs/schema';
import { assistantAgentValidator } from '#convex/modules/assistant/validators/index';
import { workspaceQuery } from '#convex/modules/auth/workspace';

export const run = workspaceQuery({
  args: { agentId: assistantAgentValidator, paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(AgentRunValidators.run),
  handler: (
    ctx,
    { agentId, paginationOpts }: { agentId: string; paginationOpts: PaginationOptions }
  ) => AgentRuns.listRuns(ctx, agentId, paginationOpts)
});
