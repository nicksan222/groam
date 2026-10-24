import { v } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { AgentWaitValidators } from '#convex/modules/assistant/waits/schema';
import { workspaceQuery } from '#convex/modules/auth/workspace';

/** The wait a run is suspended on, or null. */
export const run = workspaceQuery({
  args: { runId: v.id('agentRuns') },
  returns: v.union(AgentWaitValidators.view, v.null()),
  handler: async (ctx, { runId }) => {
    const agentRun = await AgentRuns.requireVisible(ctx, runId, ctx.workspace);
    const wait = agentRun.activeWaitId
      ? await ctx.db.get('agentWaits', agentRun.activeWaitId)
      : null;
    return wait?.status === 'waiting'
      ? await AgentWaits.present(ctx, wait, agentRun, AgentWaits.seatCheck(ctx, ctx.workspace))
      : null;
  }
});
