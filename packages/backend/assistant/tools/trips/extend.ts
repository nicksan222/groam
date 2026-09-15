import { createTool } from '@convex-dev/agent';
import { ConvexError } from 'convex/values';
import * as z from 'zod/v3';
import {
  assertDraftProposal,
  requestedTripId,
  schedulableDestinations
} from '#backend/assistant/tools/trips/shared';
import type { TripAssistantContext } from '#convex/modules/assistant/model/index';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

export function createExtendItineraryTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Lengthen a stop on a DRAFT idea by adding days at the end of its current range. Grows trip length when needed. Call startTripVersion first and pass its workingTripId plus an idea-specific destination id. Then addActivity on the new days.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const context: TripAssistantContext = await toolCtx.runQuery(
        internal.modules.assistant.model.index.tripContext,
        { tripId }
      );
      assertDraftProposal(context);
      const destination = schedulableDestinations(context).find(
        (candidate) => candidate.id === input.destinationId
      );
      if (!destination) throw new ConvexError('That destination is not available for scheduling');
      const extended: {
        endDay: number;
        extraDays: number;
        startDay: number;
        totalDurationDays: number;
      } = await toolCtx.runMutation(internal.modules.assistant.model.index.extendItinerary, {
        destinationId: destination.id,
        extraDays: input.extraDays,
        tripId
      });
      return { ...extended, destinationId: destination.id };
    },
    inputSchema: z.object({
      destinationId: z.string().describe('An exact destination id returned by context tools.'),
      extraDays: z
        .number()
        .int()
        .min(1)
        .max(14)
        .describe('How many days to add after the stop’s current last day.'),
      tripId: z
        .string()
        .optional()
        .describe(
          'The exact workingTripId returned by startTripVersion. Never use the shared trip id.'
        )
    })
  });
}
