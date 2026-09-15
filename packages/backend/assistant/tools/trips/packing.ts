import { createTool } from '@convex-dev/agent';
import { ConvexError } from 'convex/values';
import * as z from 'zod/v3';
import { requestedTripId } from '#backend/assistant/tools/trips/shared';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

export function createListPackingTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description: 'Read the packing checklist for a shared trip or its working idea.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const items = await toolCtx.runQuery(internal.modules.travel.packing.writes.list, {
        tripId
      });
      return { items, tripId };
    },
    inputSchema: z.object({
      tripId: z.string().optional().describe('The trip id. Omit for the active trip.')
    })
  });
}

export function createManagePackingTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Add, check off, rename, or remove a packing item in an editable idea. Use startTripVersion first, pass its workingTripId, and use listPacking on that idea for item ids. Requires review and applying the idea to change the shared trip.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      if (input.action === 'add') {
        if (!input.label) throw new ConvexError('Provide a packing item name');
        const item = await toolCtx.runMutation(internal.modules.travel.packing.writes.add, {
          label: input.label,
          tripId
        });
        return { action: 'add' as const, item, tripId };
      }
      if (!input.itemId) throw new ConvexError('Provide the packing item id');
      if (input.action === 'remove') {
        await toolCtx.runMutation(internal.modules.travel.packing.writes.remove, {
          itemId: input.itemId as Id<'tripPackingItems'>,
          tripId
        });
        return { action: 'remove' as const, itemId: input.itemId, tripId };
      }
      const item = await toolCtx.runMutation(internal.modules.travel.packing.writes.update, {
        itemId: input.itemId as Id<'tripPackingItems'>,
        tripId,
        ...(input.label === undefined ? {} : { label: input.label }),
        ...(input.packed === undefined ? {} : { packed: input.packed })
      });
      return { action: 'update' as const, item, tripId };
    },
    inputSchema: z.object({
      action: z.enum(['add', 'remove', 'update']).describe('add, update, or remove.'),
      itemId: z.string().optional().describe('Required for update and remove.'),
      label: z.string().optional().describe('Item name. Required for add; optional rename.'),
      packed: z.boolean().optional().describe('True when the traveler has packed this item.'),
      tripId: z
        .string()
        .optional()
        .describe(
          'The workingTripId of an editable idea. Omit only when the active trip is that idea.'
        )
    })
  });
}
