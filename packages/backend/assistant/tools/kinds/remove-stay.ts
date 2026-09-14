import { defineCapability } from '#backend/assistant/tools/factory';
import { createRemoveStayTool } from '#backend/assistant/tools/trips/stays';

export const removeStayCapability = defineCapability({
  create: ({ activeTripId }) => createRemoveStayTool(activeTripId),
  guidance:
    'Call removeStay to delete an existing stay from a draft idea. Never claim a removal unless the tool succeeds.',
  id: 'trip.stay.remove',
  toolName: 'removeStay',
  writeIntent: ['cancel hotel', 'cancel stay', 'remove hotel', 'remove stay']
});
