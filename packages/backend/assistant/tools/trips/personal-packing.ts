import { createTool, type ToolCtx } from '@convex-dev/agent';
import { ConvexError } from 'convex/values';
import * as z from 'zod/v3';
import { requestedTripId } from '#backend/assistant/tools/trips/shared';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

/**
 * The acting traveler's own private packing list. Neither tool takes a user id: every call runs
 * as the run creator, and the backend only ever returns that user's rows. These tools are bound
 * only in private chats (see the capability bindings), never in shared threads.
 */
export function createListPersonalPackingTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Read the requesting traveler’s own private packing list (items and whether each is packed) for a trip.',
    execute: async (toolCtx, input) => {
      const tripId = requestedTripId(input.tripId, activeTripId);
      const items = await toolCtx.runQuery(internal.modules.travel.packing.writes.personalList, {
        tripId
      });
      return { items, tripId };
    },
    inputSchema: z.object({
      tripId: z.string().optional().describe('The trip id. Omit for the active trip.')
    })
  });
}

type PersonalInput = {
  action: 'add' | 'remove' | 'rename' | 'tick' | 'untick';
  itemId?: string;
  label?: string;
};

async function runPersonalAction(toolCtx: ToolCtx, tripId: Id<'trips'>, input: PersonalInput) {
  const writes = internal.modules.travel.packing.writes;
  if (input.action === 'add') {
    if (!input.label) throw new ConvexError('Provide a packing item name');
    const item = await toolCtx.runMutation(writes.personalAdd, { label: input.label, tripId });
    return { action: 'add' as const, item, tripId };
  }
  if (!input.itemId) throw new ConvexError('Provide the personal packing item id');
  const itemId = input.itemId as Id<'tripPersonalPackingItems'>;
  if (input.action === 'remove') {
    await toolCtx.runMutation(writes.personalRemove, { itemId, tripId });
    return { action: 'remove' as const, itemId: input.itemId, tripId };
  }
  const packed = { rename: undefined, tick: true, untick: false }[input.action];
  const item = await toolCtx.runMutation(writes.personalUpdate, {
    itemId,
    tripId,
    ...(input.label === undefined ? {} : { label: input.label }),
    ...(packed === undefined ? {} : { packed })
  });
  return { action: input.action, item, tripId };
}

export function createManagePersonalPackingTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Add, rename, tick (packed), untick, or remove an item on the requesting traveler’s own private packing list. This is live and personal: it needs no idea and never touches the group list.',
    execute: async (toolCtx, input) =>
      await runPersonalAction(toolCtx, requestedTripId(input.tripId, activeTripId), input),
    inputSchema: z.object({
      action: z
        .enum(['add', 'remove', 'rename', 'tick', 'untick'])
        .describe('add, rename, tick (packed), untick, or remove.'),
      itemId: z
        .string()
        .optional()
        .describe('Required except for add; take it from listMyPacking.'),
      label: z.string().optional().describe('Item name. Required for add and rename.'),
      tripId: z.string().optional().describe('The trip id. Omit for the active trip.')
    })
  });
}
