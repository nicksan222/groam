import { createTool } from '@convex-dev/agent';
import { ConvexError } from 'convex/values';
import * as z from 'zod/v3';
import {
  assertDraftProposal,
  requestedTripId,
  TRIP_COST_KINDS,
  TRIP_COST_SPLITS,
  tripCostSplit
} from '#backend/assistant/tools/trips/shared';
import type { TripAssistantContext } from '#convex/modules/assistant/model/index';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

export function createSetItineraryCostTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Set or clear an estimated cost in a DRAFT idea only. Call startTripVersion, read the working itinerary, and use its workingTripId and idea-specific cost target.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const context: TripAssistantContext = await toolCtx.runQuery(
        internal.modules.assistant.model.index.tripContext,
        { tripId }
      );
      assertDraftProposal(context);
      const target = context.costTargets.find(
        (candidate) => candidate.id === input.targetId && candidate.kind === input.targetKind
      );
      if (!target) throw new ConvexError('That itinerary cost target was not found');
      const mutationTarget = (() => {
        switch (input.targetKind) {
          case 'activity':
            return {
              id: input.targetId as Id<'tripDestinationActivities'>,
              type: 'activity' as const
            };
          case 'stay':
            return { id: input.targetId as Id<'tripDestinationStays'>, type: 'stay' as const };
          case 'activity_transfer':
            return {
              id: input.targetId as Id<'tripActivityTransfers'>,
              type: 'activity_transfer' as const
            };
          case 'boundary_transfer':
            return {
              id: input.targetId as Id<'tripBoundaryTransfers'>,
              type: 'boundary_transfer' as const
            };
          case 'destination_transfer':
            return {
              id: input.targetId as Id<'tripDestinationTransfers'>,
              type: 'destination_transfer' as const
            };
        }
      })();
      await toolCtx.runMutation(internal.modules.assistant.model.index.setItineraryCost, {
        amount: input.amount,
        ...(input.amount === null ? {} : { split: tripCostSplit(input.split) }),
        target: mutationTarget,
        tripId
      });
      return {
        amount: input.amount,
        currency: context.currency,
        targetId: input.targetId,
        targetKind: input.targetKind
      };
    },
    inputSchema: z.object({
      amount: z
        .number()
        .min(0)
        .max(1_000_000_000)
        .nullable()
        .describe(
          'Cost in the trip currency, or null to clear it. Use split to say whether this is the group total or per person.'
        ),
      split: z
        .enum(TRIP_COST_SPLITS)
        .optional()
        .describe(
          'Whether amount is the group total or per person. Defaults to total. Per-person amounts are multiplied by group size toward the trip budget.'
        ),
      targetId: z.string().describe('An exact id from getItinerary costTargets.'),
      targetKind: z.enum(TRIP_COST_KINDS),
      tripId: z
        .string()
        .optional()
        .describe(
          'The exact workingTripId returned by startTripVersion. Never use the shared trip id.'
        )
    })
  });
}
