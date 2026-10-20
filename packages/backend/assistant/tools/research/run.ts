import { createTool } from '@convex-dev/agent';
import { researchEffortSchema } from '@groam/ai/backend/research';
import { ConvexError } from 'convex/values';
import * as z from 'zod/v3';
import { requestedTripId } from '#backend/assistant/tools/trips/shared';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

export function createResearchTopicTool(activeTripId: Id<'trips'> | null) {
  let requests = 0;
  return createTool({
    description:
      'Ask the researcher to investigate a topic on the web and return a cited report before continuing your task. Use when planning depends on external facts or uncertain options. Choose quick for a narrow fact, standard for a comparison, or deep for a complex decision. This does not change the itinerary. Use the returned evidence and caveats in your own decision.',
    execute: (toolCtx, input) => {
      if (requests >= 3)
        throw new ConvexError(
          'Research delegation budget reached. Use the reports already collected to continue.'
        );
      requests += 1;
      return toolCtx.runAction(internal.modules.assistant.research.functions.delegate, {
        tripId: requestedTripId(input.tripId, activeTripId),
        topic: input.topic,
        effort: input.effort
      });
    },
    inputSchema: z.object({
      topic: z
        .string()
        .trim()
        .min(1)
        .max(2000)
        .describe(
          'A concrete research question with relevant dates, places, and constraints. Omit private traveler information.'
        ),
      effort: researchEffortSchema.default('standard'),
      tripId: z.string().optional().describe('An exact trip id. Omit for the active trip.')
    })
  });
}
