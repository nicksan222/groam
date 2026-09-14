import {
  type PaginationOptions,
  paginationOptsValidator,
  paginationResultValidator
} from 'convex/server';
import { v } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentRunValidators } from '#convex/modules/assistant/runs/schema';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import type { Id } from '#convex-generated/dataModel';

export const run = workspaceQuery({
  args: { paginationOpts: paginationOptsValidator, runId: v.id('agentRuns') },
  returns: paginationResultValidator(AgentRunValidators.event),
  handler: (
    ctx,
    { paginationOpts, runId }: { paginationOpts: PaginationOptions; runId: Id<'agentRuns'> }
  ) => AgentRuns.listEvents(ctx, runId, paginationOpts)
});
