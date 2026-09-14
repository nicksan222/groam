import { defineCapability } from '#backend/assistant/tools/factory';
import { createRemoveActivityTool } from '#backend/assistant/tools/trips/activity';

export const removeActivityCapability = defineCapability({
  create: ({ activeTripId }) => createRemoveActivityTool(activeTripId),
  guidance:
    'Call removeActivity to delete an existing activity from a draft idea. Never claim a removal unless the tool succeeds.',
  id: 'trip.activity.remove',
  toolName: 'removeActivity',
  writeIntent: ['cancel', 'delete', 'drop', 'remove']
});
