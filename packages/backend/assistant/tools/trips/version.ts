import { createTool } from '@convex-dev/agent';
import * as z from 'zod/v3';
import { requestedTripId } from '#backend/assistant/tools/trips/shared';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

export function createStartTripVersionTool(
  activeTripId: Id<'trips'> | null,
  options?: { issueId?: Id<'tripIssues'>; runId?: Id<'agentRuns'> }
) {
  // Reuse the started version per trip; a different trip starts its own.
  const started = new Map<
    string,
    {
      ideaName: string;
      proposalId: Id<'tripProposals'>;
      status: 'draft';
      workingTripId: Id<'trips'>;
    }
  >();
  return createTool({
    description:
      'Start or reopen the traveler’s private draft idea for an existing shared trip. Every itinerary or trip-detail write must target the returned workingTripId, never the shared trip id. When the active trip is already an idea working copy, this returns that idea — it never creates an idea from an idea. After calling this, read the idea trip again before making changes because its destination and activity ids are idea-specific. When working an assigned issue, this links the idea to that issue.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const previous = started.get(tripId);
      if (previous) return previous;
      const version = await toolCtx.runMutation(
        internal.modules.assistant.model.index.prepareTripVersion,
        {
          tripId,
          ...(options?.issueId ? { issueId: options.issueId } : {}),
          ...(options?.runId ? { runId: options.runId } : {})
        }
      );
      const result = {
        ideaName: version.ideaName,
        proposalId: version.proposalId,
        status: 'draft' as const,
        workingTripId: version.workingTripId
      };
      started.set(tripId, result);
      return result;
    },
    inputSchema: z.object({
      tripId: z
        .string()
        .optional()
        .describe('The shared trip id. Omit when the shared trip is the active context.')
    })
  });
}
