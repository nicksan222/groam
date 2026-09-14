import { createTool } from '@convex-dev/agent';
import * as z from 'zod/v3';
import { requestedTripId } from '#backend/assistant/tools/trips/shared';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

export function createTripIssueTool(activeTripId: Id<'trips'> | null) {
  let created: { issueId: Id<'tripIssues'>; status: 'open'; tripId: Id<'trips'> } | undefined;
  return createTool({
    description:
      'Create a scoped issue on an existing shared trip and assign it to the Issue agent. Use issues for planning questions, bugs, requests, and work that is not yet an implementation. Creating an issue queues the Issue agent; it does not start a chat or change the trip.',
    execute: async (toolCtx, input) => {
      if (created) return created;
      const tripId = requestedTripId(input.tripId, activeTripId);
      const issueId = await toolCtx.runMutation(
        internal.modules.assistant.model.index.createTripIssue,
        {
          body: input.body,
          title: input.title,
          tripId
        }
      );
      created = { issueId, status: 'open' as const, tripId };
      return created;
    },
    inputSchema: z.object({
      body: z.string().min(1).max(5000).describe('Context and a clear expected outcome.'),
      title: z.string().min(1).max(160).describe('A concise actionable issue title.'),
      tripId: z.string().optional().describe('The shared trip id. Omit for the active trip.')
    })
  });
}
