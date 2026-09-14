import { createTool } from '@convex-dev/agent';
import * as z from 'zod/v3';
import {
  itinerarySnapshot,
  requestedTripId,
  statusSnapshot
} from '#backend/assistant/tools/trips/shared';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

const tripIdInputSchema = z.object({
  tripId: z.string().optional().describe('An exact trip id from context tools.')
});

export function createGetItineraryTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Read a verified route, destination day ranges, stays, activities, transport cost targets, global budget, and planned costs. Pass an exact trip id from context tools, or omit it for the active trip.',
    execute: async (toolCtx, input) => {
      const itinerary = itinerarySnapshot(
        await toolCtx.runQuery(internal.modules.assistant.model.index.tripContext, {
          tripId: requestedTripId(input.tripId, activeTripId)
        })
      );
      return { itinerary };
    },
    inputSchema: tripIdInputSchema
  });
}

export function createGetTripStatusTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Read verified readiness, dates, traveler count, and decisions. Pass an exact trip id from context tools, or omit it for the active trip.',
    execute: async (toolCtx, input) => {
      const status = statusSnapshot(
        await toolCtx.runQuery(internal.modules.assistant.model.index.tripContext, {
          tripId: requestedTripId(input.tripId, activeTripId)
        })
      );
      return { status };
    },
    inputSchema: tripIdInputSchema
  });
}
