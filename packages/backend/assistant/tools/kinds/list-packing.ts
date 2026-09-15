import { defineCapability } from '#backend/assistant/tools/factory';
import { createListPackingTool } from '#backend/assistant/tools/trips/packing';

export const listPackingCapability = defineCapability({
  create: ({ activeTripId }) => createListPackingTool(activeTripId),
  guidance:
    'Call listPacking to read the packing checklist for the requested trip or idea. Before editing, read the working idea to get its item ids.',
  id: 'trip.packing.read',
  toolName: 'listPacking'
});
