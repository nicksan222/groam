import { defineCapability } from '#backend/assistant/tools/factory';
import { createSetTransferTool } from '#backend/assistant/tools/trips/transfers';

export const setTransferCapability = defineCapability({
  create: ({ activeTripId }) => createSetTransferTool(activeTripId),
  guidance:
    'Call setTransfer to set arrival, departure, between-stop, or between-activity travel on a draft idea. Never claim travel was saved unless the tool succeeds.',
  id: 'trip.transfer.set',
  toolName: 'setTransfer',
  writeIntent: [
    'arrival',
    'departure',
    'flight',
    'train',
    'transfer',
    'travel between',
    'travel home',
    'travel to'
  ]
});
