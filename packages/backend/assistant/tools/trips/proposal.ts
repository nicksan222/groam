import { createTool } from '@convex-dev/agent';
import type { AssistantContextTag } from '@groam/ai-contracts/agents/registry';
import { AssistantContextTags } from '@groam/ai-contracts/agents/registry';
import * as z from 'zod/v3';
import { CURRENCIES, DEFAULT_TRIP_CURRENCY } from '#backend/assistant/tools/trips/shared';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

export function createTripProposalTool(threadId: string, scope: 'discussion' | 'private') {
  return createTool({
    description:
      'Create a new trip after the traveler explicitly confirms the name and any known destination. Optional details can be refined later.',
    execute: async (toolCtx, input) => {
      const [tripId, access]: [Id<'trips'>, { tags: AssistantContextTag[] }] = await Promise.all([
        toolCtx.runMutation(internal.modules.travel.trips.commit.create, {
          input: {
            ...(input.budgetAmount ? { budget: { amount: input.budgetAmount } } : {}),
            clientRequestId: `assistant-${crypto.randomUUID()}`,
            currency: input.currency ?? DEFAULT_TRIP_CURRENCY,
            ...(input.dateNotes ? { dateNotes: input.dateNotes } : {}),
            destination: input.destination
              ? {
                  ...(input.countryCode ? { countryCode: input.countryCode.toUpperCase() } : {}),
                  name: input.destination,
                  status: 'known' as const
                }
              : { status: 'undecided' as const },
            ...(input.totalDays ? { duration: { totalDays: input.totalDays } } : {}),
            name: input.name,
            ...(input.startDate ? { startDate: input.startDate } : {})
          },
          signatureValid: true
        }),
        toolCtx.runQuery(internal.modules.assistant.model.index.access, { scope, threadId })
      ]);
      if (access.tags.length < 12) {
        await toolCtx.runMutation(internal.modules.assistant.model.index.setContextTags, {
          tags: [
            ...access.tags.map((tag) => AssistantContextTags.referenceForMutation(tag)),
            { id: tripId, kind: 'trip' as const }
          ],
          scope,
          threadId
        });
      }
      return {
        name: input.name,
        tripId
      };
    },
    inputSchema: z.object({
      budgetAmount: z
        .number()
        .positive()
        .optional()
        .describe('Total group budget in the trip currency — not a per-person amount.'),
      countryCode: z.string().length(2).optional(),
      currency: z.enum(CURRENCIES).optional(),
      dateNotes: z.string().max(240).optional(),
      destination: z.string().min(1).max(120).optional(),
      name: z.string().min(1).max(100),
      startDate: z.string().max(10).optional(),
      totalDays: z.number().int().min(1).max(365).optional()
    })
  });
}
