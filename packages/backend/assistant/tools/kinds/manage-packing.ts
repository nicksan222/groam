import { defineCapability } from '#backend/assistant/tools/factory';
import { createManagePackingTool } from '#backend/assistant/tools/trips/packing';

export const managePackingCapability = defineCapability({
  create: ({ activeTripId }) => createManagePackingTool(activeTripId),
  guidance:
    'Call managePacking to add, check off, rename, or remove packing items in an editable idea. Start or reopen an idea first, use its workingTripId, and read its packing list for item ids. Changes reach the shared trip only after approval and applying the idea.',
  id: 'trip.packing.manage',
  toolName: 'managePacking',
  writeIntent: [
    'add',
    'change ... packing',
    'change the packing',
    'check off',
    'delete ... packing',
    'delete the packing',
    'mark packed',
    'pack',
    'packed',
    'remove',
    'rename',
    'unpack',
    'update ... packing',
    'update the packing'
  ]
});
