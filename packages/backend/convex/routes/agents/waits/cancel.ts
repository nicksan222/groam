import { ConvexError, v } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { workspaceMutation } from '#convex/modules/auth/workspace';

/** Resolves the wait as cancelled; the run resumes and can wrap up. No-op once resolved. */
export const run = workspaceMutation({
  args: { waitId: v.id('agentWaits') },
  returns: v.null(),
  handler: async (ctx, { waitId }) => {
    const wait = await ctx.db.get('agentWaits', waitId);
    if (!wait || wait.organizationId !== ctx.workspace.organizationId) {
      throw new ConvexError('Wait not found');
    }
    const agentRun = await AgentRuns.requireVisible(ctx, wait.runId, ctx.workspace);
    await AgentRuns.assertCanControl(ctx, agentRun, ctx.workspace);
    await AgentWaits.cancel(ctx, {
      notify: true,
      reason: `${ctx.workspace.viewerName} cancelled the wait`,
      waitId
    });
    return null;
  }
});
