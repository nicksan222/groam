import { defineCapability } from '#backend/assistant/tools/factory';
import { createRemoveTransferTool } from '#backend/assistant/tools/trips/transfers';

export const removeTransferCapability = defineCapability({
  create: ({ activeTripId }) => createRemoveTransferTool(activeTripId),
  guidance:
    'Call removeTransfer to delete arrival, departure, between-stop, or between-activity travel from a draft idea. Never claim a removal unless the tool succeeds.',
  id: 'trip.transfer.remove',
  toolName: 'removeTransfer',
  writeIntent: ['remove flight', 'remove transfer', 'remove travel']
});
