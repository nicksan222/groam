import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import type { AssistantScreen } from '#convex/modules/assistant/agent/index';
import { AgentEngine } from '#convex/modules/assistant/engine/index';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';
import { AssistantScreens } from '#convex/modules/assistant/screen/index';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import { Discussions } from '#convex/modules/discussions/threads/index';

/**
 * Claims the prompt so two clients cannot answer it twice, then starts the run's workflow; the
 * reply streams from the workflow's turn action.
 */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class DiscussionAssistant {
  static async respond(
    ctx: MutationCtx,
    args: { discussionId: Id<'discussions'>; promptMessageId: string; screen: AssistantScreen }
  ): Promise<null> {
    const workspace = await requireWorkspace(ctx);
    AssistantScreens.validate(args.screen);
    const claim = await Discussions.claimAssistantResponse(
      ctx,
      args.discussionId,
      args.promptMessageId,
      args.screen
    );
    // Already claimed or finished by another client — treat as a no-op.
    if (!claim) return null;
    try {
      // After the claim, so a rate-limit refusal fails the request instead of leaving it queued.
      await aiRateLimiter.limit(ctx, 'tripAssistantMessage', {
        key: workspace.tokenIdentifier,
        throws: true
      });
    } catch (error: unknown) {
      await Discussions.finishAssistantResponse(ctx, {
        discussionId: args.discussionId,
        error: AssistantErrors.message(error),
        expectedUpdatedAt: claim.expectedUpdatedAt,
        promptMessageId: args.promptMessageId,
        responseText: null,
        runId: claim.runId
      });
      return null;
    }
    return await AgentEngine.start(ctx, claim.runId);
  }
}
