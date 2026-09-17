import { ConvexError } from 'convex/values';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import { type AssistantScreen, AssistantSession } from '#convex/modules/assistant/agent/index';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';
import { AgentRunTracking } from '#convex/modules/assistant/runs/tracking';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ActionCtx } from '#convex-generated/server';

/**
 * Action-side assistant reply. Mutations in `assistant/index.ts` claim and finish the
 * request so two clients cannot stream the same prompt twice.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class DiscussionAssistant {
  static async respond(
    ctx: ActionCtx,
    args: {
      discussionId: Id<'discussions'>;
      promptMessageId: string;
      screen: AssistantScreen;
    }
  ): Promise<null> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Not authenticated');
    try {
      await aiRateLimiter.limit(ctx, 'tripAssistantMessage', {
        key: identity.tokenIdentifier,
        throws: true
      });
    } catch (error: unknown) {
      throw new ConvexError(AssistantErrors.message(error));
    }
    const claim = await ctx.runMutation(
      internal.modules.discussions.assistant.index.claimResponse,
      {
        discussionId: args.discussionId,
        promptMessageId: args.promptMessageId
      }
    );
    // Already claimed or finished by another client — treat as a no-op.
    if (!claim) return null;
    try {
      const responseText = await AssistantSession.continueDiscussion(
        ctx,
        {
          agent: claim.agent,
          prompt: claim.prompt,
          screen: args.screen,
          threadId: claim.threadId
        },
        args.promptMessageId,
        claim.runId
      );
      if (await AgentRunTracking.isAborted(ctx, claim.runId)) {
        await ctx.runMutation(internal.modules.discussions.assistant.index.finishResponse, {
          discussionId: args.discussionId,
          expectedUpdatedAt: claim.expectedUpdatedAt,
          promptMessageId: args.promptMessageId,
          responseText: null,
          runId: claim.runId
        });
        return null;
      }
      await ctx.runMutation(internal.modules.discussions.assistant.index.finishResponse, {
        discussionId: args.discussionId,
        expectedUpdatedAt: claim.expectedUpdatedAt,
        promptMessageId: args.promptMessageId,
        responseText,
        runId: claim.runId
      });
    } catch (error: unknown) {
      if (await AgentRunTracking.isAborted(ctx, claim.runId)) {
        await ctx.runMutation(internal.modules.discussions.assistant.index.finishResponse, {
          discussionId: args.discussionId,
          expectedUpdatedAt: claim.expectedUpdatedAt,
          promptMessageId: args.promptMessageId,
          responseText: null,
          runId: claim.runId
        });
        return null;
      }
      // Mark the request failed for UI, but do not rethrow — otherwise clients get a redacted
      // Convex "Server Error / An error occurred" toast on top of the failed assistant bubble.
      const message = AssistantErrors.message(error);
      console.error('discussion assistant respond failed:', message, error);
      await AgentRunTracking.record(ctx, claim.runId, {
        detail: message,
        kind: 'error',
        label: 'Run failed'
      });
      await ctx.runMutation(internal.modules.discussions.assistant.index.finishResponse, {
        discussionId: args.discussionId,
        error: message,
        expectedUpdatedAt: claim.expectedUpdatedAt,
        promptMessageId: args.promptMessageId,
        responseText: null,
        runId: claim.runId
      });
    }
    return null;
  }
}
