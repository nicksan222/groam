import { createTool } from '@convex-dev/agent';
import * as z from 'zod/v3';
import { LOCAL_DATE_PATTERN, requestedTripId } from '#backend/assistant/tools/trips/shared';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

export function createSetTripDatesTool(activeTripId: Id<'trips'> | null) {
  let saved:
    | {
        endDate: string;
        startDate: string;
        status: 'saved';
        tripId: Id<'trips'>;
      }
    | undefined;
  return createTool({
    description:
      'Set exact start and end dates on an existing DRAFT trip idea. Call startTripVersion first, read its workingTripId, and pass that workingTripId here. Never pass the protected shared trip id. The end date is exclusive, so 2027-01-01 through 2027-01-10 is 9 days.',
    execute: async (toolCtx, input) => {
      if (saved) return saved;
      const tripId = requestedTripId(input.tripId, activeTripId);
      await toolCtx.runMutation(internal.modules.assistant.model.index.setTripVersionDates, {
        endDate: input.endDate,
        startDate: input.startDate,
        tripId
      });
      saved = {
        endDate: input.endDate,
        startDate: input.startDate,
        status: 'saved' as const,
        tripId
      };
      return saved;
    },
    inputSchema: z.object({
      endDate: z
        .string()
        .regex(LOCAL_DATE_PATTERN)
        .describe('The exclusive trip end date in YYYY-MM-DD format.'),
      startDate: z
        .string()
        .regex(LOCAL_DATE_PATTERN)
        .describe('The start date in YYYY-MM-DD format.'),
      tripId: z
        .string()
        .optional()
        .describe(
          'The exact workingTripId returned by startTripVersion. Never use the shared trip id.'
        )
    })
  });
}
