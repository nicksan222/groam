import { v } from 'convex/values';
import { chatAgentValidator } from '#convex/modules/assistant/validators/index';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { internalMutation } from '#convex-generated/server';

export const claimResponse = internalMutation({
  args: {
    discussionId: v.id('discussions'),
    promptMessageId: v.string()
  },
  returns: v.union(
    v.object({
      agent: chatAgentValidator,
      expectedUpdatedAt: v.number(),
      prompt: v.string(),
      runId: v.id('agentRuns'),
      threadId: v.string()
    }),
    v.null()
  ),
  handler: (ctx, { discussionId, promptMessageId }) =>
    Discussions.claimAssistantResponse(ctx, discussionId, promptMessageId)
});

export const finishResponse = internalMutation({
  args: {
    discussionId: v.id('discussions'),
    expectedUpdatedAt: v.number(),
    promptMessageId: v.string(),
    responseText: v.union(v.string(), v.null()),
    runId: v.id('agentRuns'),
    error: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (
    ctx,
    { discussionId, error, expectedUpdatedAt, promptMessageId, responseText, runId }
  ) => {
    await Discussions.finishAssistantResponse(ctx, {
      discussionId,
      error,
      expectedUpdatedAt,
      promptMessageId,
      responseText,
      runId
    });
    return null;
  }
});
