import { createTool } from '@convex-dev/agent';
import type { ChatAgentId } from '@groam/ai/agents';
import * as z from 'zod/v3';
import { requestedTripId } from '#backend/assistant/tools/trips/shared';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { DiscussionLinkTarget } from '#convex/modules/discussions/links/schema';

const discussionIdField = z
  .string()
  .describe('The exact research id from listResearches, readResearch, or the screen context.');

export function createListResearchesTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'List the researches of a trip with id, title, brief, and last activity. Omit the trip id for the active trip.',
    execute: async (toolCtx, input) => {
      const researches = await toolCtx.runQuery(internal.modules.discussions.research.tools.list, {
        tripId: requestedTripId(input.tripId, activeTripId)
      });
      return {
        researches: researches.map((research) => ({
          brief: research.brief,
          id: research.id,
          lastMessage: research.lastMessage,
          linkCount: research.linkCount,
          title: research.title,
          updatedAt: research.updatedAt
        }))
      };
    },
    inputSchema: z.object({
      tripId: z.string().optional().describe('An exact trip id. Omit for the active trip.')
    })
  });
}

export function createReadResearchTool() {
  return createTool({
    description:
      'Read one research: its brief, linked trip items, and the most recent messages as text.',
    execute: async (toolCtx, input) => ({
      research: await toolCtx.runQuery(internal.modules.discussions.research.tools.read, {
        discussionId: input.researchId as Id<'discussions'>
      })
    }),
    inputSchema: z.object({ researchId: discussionIdField })
  });
}

export function createCreateResearchTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Create a research on a trip about one subject, with an optional brief. Others on the trip can then add links and notes.',
    execute: async (toolCtx, input) => {
      const researchId = await toolCtx.runMutation(
        internal.modules.discussions.research.tools.create,
        {
          ...(input.brief ? { brief: input.brief } : {}),
          clientRequestId: crypto.randomUUID(),
          title: input.title,
          tripId: requestedTripId(input.tripId, activeTripId)
        }
      );
      return { researchId };
    },
    inputSchema: z.object({
      brief: z.string().max(2000).optional().describe('What the traveler wants to find out.'),
      title: z
        .string()
        .min(1)
        .max(100)
        .describe('The research subject, such as "Museums in Lisbon".'),
      tripId: z.string().optional().describe('An exact trip id. Omit for the active trip.')
    })
  });
}

export function createPostToResearchTool(agentId: ChatAgentId) {
  return createTool({
    description:
      'Post a message into a research thread as the assistant. Use for findings or summaries the traveler asked to save there.',
    execute: async (toolCtx, input) => {
      const { messageId } = await toolCtx.runMutation(
        internal.modules.discussions.research.tools.post,
        { agentId, discussionId: input.researchId as Id<'discussions'>, text: input.text }
      );
      return { messageId, status: 'posted' as const };
    },
    inputSchema: z.object({
      researchId: discussionIdField,
      text: z.string().min(1).max(5000).describe('The message to post, in plain text or Markdown.')
    })
  });
}

function linkTarget(input: { targetId: string; targetType: string }): DiscussionLinkTarget {
  switch (input.targetType) {
    case 'issue':
      return { issueId: input.targetId as Id<'tripIssues'>, kind: 'issue' };
    case 'idea':
      return { kind: 'idea', proposalId: input.targetId as Id<'tripProposals'> };
    case 'destination':
      return {
        kind: 'tripTarget',
        target: { id: input.targetId as Id<'tripDestinations'>, type: 'destination' }
      };
    case 'activity':
      return {
        kind: 'tripTarget',
        target: { id: input.targetId as Id<'tripDestinationActivities'>, type: 'activity' }
      };
    default:
      return {
        kind: 'tripTarget',
        target: { id: input.targetId as Id<'tripDestinationStays'>, type: 'stay' }
      };
  }
}

export function createLinkResearchTool() {
  return createTool({
    description:
      'Link a research to, or unlink it from, an issue, idea, destination, activity, or stay of its trip.',
    execute: async (toolCtx, input) => {
      const args = {
        discussionId: input.researchId as Id<'discussions'>,
        target: linkTarget(input)
      };
      if (input.action === 'unlink') {
        await toolCtx.runMutation(internal.modules.discussions.research.tools.unlink, args);
      } else {
        await toolCtx.runMutation(internal.modules.discussions.research.tools.link, args);
      }
      return { action: input.action, status: 'done' as const };
    },
    inputSchema: z.object({
      action: z.enum(['link', 'unlink']),
      researchId: discussionIdField,
      targetId: z.string().describe('The exact id of the item to link.'),
      targetType: z.enum(['issue', 'idea', 'destination', 'activity', 'stay'])
    })
  });
}
