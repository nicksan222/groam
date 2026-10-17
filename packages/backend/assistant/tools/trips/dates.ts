import { createTool } from '@convex-dev/agent';
import * as z from 'zod/v3';
import {
  LOCAL_DATE_PATTERN,
  requestedTripId,
  workingTripIdField
} from '#backend/assistant/tools/trips/shared';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

export function createSetTripDatesTool(activeTripId: Id<'trips'> | null) {
  // Idempotent per identical input; different dates perform a new write.
  const saved = new Map<
    string,
    { endDate: string; startDate: string; status: 'saved'; tripId: Id<'trips'> }
  >();
  return createTool({
    description:
      'Set exact start and end dates on an existing DRAFT trip idea. Call startTripVersion first, read its workingTripId, and pass that workingTripId here. Never pass the protected shared trip id. The end date is exclusive, so 2027-01-01 through 2027-01-10 is 9 days.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const key = JSON.stringify([tripId, input.startDate, input.endDate]);
      const previous = saved.get(key);
      if (previous) return previous;
      await toolCtx.runMutation(internal.modules.assistant.model.index.setTripVersionDates, {
        endDate: input.endDate,
        startDate: input.startDate,
        tripId
      });
      const result = {
        endDate: input.endDate,
        startDate: input.startDate,
        status: 'saved' as const,
        tripId
      };
      saved.set(key, result);
      return result;
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
      tripId: workingTripIdField()
    })
  });
}
