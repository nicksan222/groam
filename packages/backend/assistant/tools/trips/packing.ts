import { createTool, type ToolCtx } from '@convex-dev/agent';
import { ConvexError } from 'convex/values';
import * as z from 'zod/v3';
import { loadDraftTripContext, requestedTripId } from '#backend/assistant/tools/trips/shared';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

export function createListPackingTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Read the group packing list (needed quantity, who is bringing each item, coverage) plus every trip traveler with userId and RSVP, for a shared trip or its working idea.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const [items, travelers] = await Promise.all([
        toolCtx.runQuery(internal.modules.travel.packing.writes.list, { tripId }),
        toolCtx.runQuery(internal.modules.travel.packing.writes.travelers, { tripId })
      ]);
      // Coverage is computed here so the model never has to add counts itself.
      return {
        items: items.map((item) => ({
          ...item,
          coverage:
            item.brought >= item.quantity ? 'covered' : `needs ${item.quantity - item.brought} more`
        })),
        tripId,
        travelers
      };
    },
    inputSchema: z.object({
      tripId: z.string().optional().describe('The trip id. Omit for the active trip.')
    })
  });
}

type PackingInput = {
  action: 'add' | 'bring' | 'remove' | 'update';
  count?: number;
  itemId?: string;
  label?: string;
  quantity?: number;
  userId?: string;
};

async function runPackingAction(toolCtx: ToolCtx, tripId: Id<'trips'>, input: PackingInput) {
  const writes = internal.modules.travel.packing.writes;
  if (input.action === 'add') {
    if (!input.label) throw new ConvexError('Provide a packing item name');
    const item = await toolCtx.runMutation(writes.add, {
      label: input.label,
      ...(input.quantity === undefined ? {} : { quantity: input.quantity }),
      tripId
    });
    return { action: 'add' as const, item, tripId };
  }
  if (!input.itemId) throw new ConvexError('Provide the packing item id');
  const itemId = input.itemId as Id<'tripPackingItems'>;
  if (input.action === 'remove') {
    await toolCtx.runMutation(writes.remove, { itemId, tripId });
    return { action: 'remove' as const, itemId: input.itemId, tripId };
  }
  if (input.action === 'bring') {
    if (!input.userId) throw new ConvexError('Provide the traveler id');
    if (input.count === undefined) throw new ConvexError('Provide how many they will bring');
    const { count, userId } = input;
    await toolCtx.runMutation(writes.bring, { count, itemId, tripId, userId });
    return { action: 'bring' as const, count, itemId: input.itemId, tripId, userId };
  }
  const item = await toolCtx.runMutation(writes.update, {
    itemId,
    tripId,
    ...(input.label === undefined ? {} : { label: input.label }),
    ...(input.quantity === undefined ? {} : { quantity: input.quantity })
  });
  return { action: 'update' as const, item, tripId };
}

export function createManagePackingTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Add, rename, change the quantity of, remove, or assign a traveler to a group packing item in an editable idea. Use startTripVersion first, pass its workingTripId, and use listPacking on that idea for item and traveler ids. Requires review and applying the idea to change the shared trip.',
    execute: async (toolCtx, input) => {
      // Packing edits on an in-review idea would clear its approvals; draft only.
      const { tripId } = await loadDraftTripContext(toolCtx, input.tripId, activeTripId);
      return await runPackingAction(toolCtx, tripId, input);
    },
    inputSchema: z.object({
      action: z
        .enum(['add', 'bring', 'remove', 'update'])
        .describe(
          'add an item, update its name or quantity, bring to set how many one traveler brings, or remove.'
        ),
      count: z
        .number()
        .int()
        .min(0)
        .max(99)
        .optional()
        .describe('For bring: how many this traveler brings. 0 takes them off the item.'),
      itemId: z.string().optional().describe('Required for update, bring, and remove.'),
      label: z.string().optional().describe('Item name. Required for add; optional rename.'),
      quantity: z
        .number()
        .int()
        .min(1)
        .max(99)
        .optional()
        .describe('How many the group needs. Defaults to 1 on add.'),
      tripId: z
        .string()
        .optional()
        .describe(
          'The workingTripId of an editable idea. Omit only when the active trip is that idea.'
        ),
      userId: z
        .string()
        .optional()
        .describe('For bring: a traveler userId from the travelers returned by listPacking.')
    })
  });
}
