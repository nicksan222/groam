import { assistantAgents, isChatAgent } from '@groam/ai/agents';
import { ConvexError, v } from 'convex/values';
import { internalMutation, internalQuery } from '#convex-generated/server';
import {
  assistantScreenValidator,
  chatAgentValidator
} from '#convex/modules/assistant/validators/index';
import { DiscussionAssistant } from '#convex/modules/discussions/assistant/respond';
import { Discussions } from '#convex/modules/discussions/threads/index';

export const claimResponse = internalMutation({
  args: {
    discussionId: v.id('discussions'),
    promptMessageId: v.string(),
    screen: assistantScreenValidator
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
  handler: (ctx, { discussionId, promptMessageId, screen }) =>
    Discussions.claimAssistantResponse(ctx, discussionId, promptMessageId, screen)
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

/** The stored request a workflow chat turn answers (the turn has no client args). */
export const prompt = internalQuery({
  args: { discussionId: v.id('discussions'), promptMessageId: v.string() },
  returns: v.object({ agent: chatAgentValidator, prompt: v.string() }),
  handler: async (ctx, { discussionId, promptMessageId }) => {
    const request = await ctx.db
      .query('discussionMessages')
      .withIndex('by_discussionId_and_agentMessageId', (query) =>
        query.eq('discussionId', discussionId).eq('agentMessageId', promptMessageId)
      )
      .unique();
    if (!request?.assistantAgent) throw new ConvexError('AI request not found');
    const agent = assistantAgents[request.assistantAgent];
    if (!isChatAgent(agent))
      throw new ConvexError('This agent runs research tasks instead of chat');
    return { agent: agent.id, prompt: request.content.text };
  }
});

/** Claims the prompt and starts its run's workflow, as the signed-in caller of `respond`. */
export const respond = internalMutation({
  args: {
    discussionId: v.id('discussions'),
    promptMessageId: v.string(),
    screen: assistantScreenValidator
  },
  returns: v.null(),
  handler: (ctx, args) => DiscussionAssistant.respond(ctx, args)
});
