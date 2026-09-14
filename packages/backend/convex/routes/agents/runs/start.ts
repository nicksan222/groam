import { ConvexError, v } from 'convex/values';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';
import { StandaloneSession } from '#convex/modules/assistant/standalone/index';
import { workspaceAction } from '#convex/modules/auth/workspace';
import { internal } from '#convex-generated/api';

export const run = workspaceAction({
  args: { runId: v.id('agentRuns') },
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    const stored = await ctx.runQuery(internal.modules.assistant.runs.functions.getInternal, {
      organizationId: ctx.workspace.organizationId,
      runId
    });
    if (!stored) throw new ConvexError('Agent run not found');
    if (stored.surface !== 'standalone') {
      throw new ConvexError('Only standalone runs start from the agent monitor');
    }
    try {
      await aiRateLimiter.limit(ctx, 'tripAssistantMessage', {
        key: ctx.workspace.tokenIdentifier,
        throws: true
      });
    } catch (error: unknown) {
      throw new ConvexError(AssistantErrors.message(error));
    }
    await StandaloneSession.execute(ctx, runId);
    return null;
  }
});
