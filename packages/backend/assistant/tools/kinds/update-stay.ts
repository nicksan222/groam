import { defineCapability } from '#backend/assistant/tools/factory';
import { createUpdateStayTool } from '#backend/assistant/tools/trips/stays';

export const updateStayCapability = defineCapability({
  create: ({ activeTripId }) => createUpdateStayTool(activeTripId),
  guidance:
    'Call updateStay to change an existing stay on a draft idea. Never claim a change unless the tool succeeds.',
  id: 'trip.stay.update',
  toolName: 'updateStay',
  writeIntent: ['change hotel', 'change stay', 'update hotel', 'update stay']
});
