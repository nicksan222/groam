import { v } from 'convex/values';
import { assistantAgentValidator } from '#convex/modules/assistant/validators/index';
import { internalWorkspaceMutation, internalWorkspaceQuery } from '#convex/modules/auth/workspace';
import { DiscussionLinks } from '#convex/modules/discussions/links/index';
import { DiscussionLinkValidators } from '#convex/modules/discussions/links/schema';
import { ResearchAssistant } from '#convex/modules/discussions/research/assistant';
import { Research } from '#convex/modules/discussions/research/index';
import { ResearchValidators } from '#convex/modules/discussions/research/schema';

/**
 * Internal entry points for the assistant research tools; each runs as the calling user, or as
 * the run's creator when an agent turn passes `asRun`.
 */
export const list = internalWorkspaceQuery({
  args: { tripId: v.id('trips') },
  returns: v.array(ResearchValidators.listed),
  handler: (ctx, { tripId }) => Research.listForTrip(ctx, tripId, 'research')
});

export const read = internalWorkspaceQuery({
  args: { discussionId: v.id('discussions') },
  returns: v.object({
    brief: v.union(v.string(), v.null()),
    latestReport: v.union(
      v.object({
        report: v.string(),
        sources: v.array(v.object({ url: v.string(), title: v.string() }))
      }),
      v.null()
    ),
    id: v.id('discussions'),
    links: v.array(v.object({ kind: v.string(), label: v.string(), targetId: v.string() })),
    messages: v.array(v.object({ author: v.string(), text: v.string() })),
    title: v.string(),
    tripId: v.id('trips'),
    writable: v.boolean()
  }),
  handler: (ctx, { discussionId }) => ResearchAssistant.read(ctx, discussionId)
});

export const create = internalWorkspaceMutation({
  args: {
    brief: v.optional(v.string()),
    clientRequestId: v.string(),
    title: v.string(),
    tripId: v.id('trips')
  },
  returns: v.id('discussions'),
  handler: (ctx, input) => Research.create(ctx, input)
});

export const post = internalWorkspaceMutation({
  args: { agentId: assistantAgentValidator, discussionId: v.id('discussions'), text: v.string() },
  returns: v.object({ messageId: v.string() }),
  handler: (ctx, { agentId, discussionId, text }) =>
    ResearchAssistant.post(ctx, discussionId, agentId, text)
});

export const link = internalWorkspaceMutation({
  args: { discussionId: v.id('discussions'), target: DiscussionLinkValidators.target },
  returns: v.id('discussionLinks'),
  handler: (ctx, { discussionId, target }) => DiscussionLinks.link(ctx, discussionId, target)
});

export const unlink = internalWorkspaceMutation({
  args: { discussionId: v.id('discussions'), target: DiscussionLinkValidators.target },
  returns: v.null(),
  handler: (ctx, { discussionId, target }) => DiscussionLinks.unlink(ctx, discussionId, target)
});

export const instructionContext = internalWorkspaceQuery({
  args: { threadId: v.string() },
  returns: v.union(
    v.object({
      brief: v.union(v.string(), v.null()),
      links: v.array(
        v.object({
          kind: v.union(
            v.literal('issue'),
            v.literal('idea'),
            v.literal('destination'),
            v.literal('activity'),
            v.literal('stay')
          ),
          label: v.string()
        })
      ),
      title: v.string()
    }),
    v.null()
  ),
  handler: (ctx, { threadId }) => ResearchAssistant.instructionContext(ctx, threadId)
});
