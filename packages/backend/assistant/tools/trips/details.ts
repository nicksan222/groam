import { createTool } from '@convex-dev/agent';
import { ConvexError } from 'convex/values';
import * as z from 'zod/v3';
import {
  assertDraftProposal,
  MAX_TITLE_LENGTH,
  requestedTripId
} from '#backend/assistant/tools/trips/shared';
import type { TripAssistantContext } from '#convex/modules/assistant/model/index';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

export function createUpdateTripDetailsTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Update draft-idea trip details such as name, budget, date notes, or total days. Call startTripVersion first and pass its workingTripId. Omit fields you are not changing. Pass budgetAmount or dateNotes null to clear them.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const context: TripAssistantContext = await toolCtx.runQuery(
        internal.modules.assistant.model.index.tripContext,
        { tripId }
      );
      assertDraftProposal(context);
      if (
        input.budgetAmount === undefined &&
        input.dateNotes === undefined &&
        input.name === undefined &&
        input.totalDays === undefined
      ) {
        throw new ConvexError('Provide at least one field to update');
      }
      await toolCtx.runMutation(internal.modules.assistant.model.writes.updateTripDetails, {
        ...(input.budgetAmount === undefined ? {} : { budgetAmount: input.budgetAmount }),
        ...(input.dateNotes === undefined ? {} : { dateNotes: input.dateNotes }),
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.totalDays === undefined ? {} : { totalDays: input.totalDays }),
        tripId
      });
      return {
        budgetAmount: input.budgetAmount === undefined ? context.initialBudget : input.budgetAmount,
        dateNotes: input.dateNotes === undefined ? context.dateNotes : input.dateNotes,
        name: input.name?.trim() ?? context.tripName,
        totalDays: input.totalDays ?? context.totalDurationDays
      };
    },
    inputSchema: z.object({
      budgetAmount: z
        .number()
        .min(0)
        .max(1_000_000_000)
        .nullable()
        .optional()
        .describe('Trip budget in the trip currency. Pass null to clear it.'),
      dateNotes: z
        .string()
        .max(240)
        .nullable()
        .optional()
        .describe('Flexible date notes. Pass null to clear them.'),
      name: z.string().min(1).max(MAX_TITLE_LENGTH).optional(),
      totalDays: z.number().int().min(1).max(365).optional(),
      tripId: z
        .string()
        .optional()
        .describe(
          'The exact workingTripId returned by startTripVersion. Never use the shared trip id.'
        )
    })
  });
}
