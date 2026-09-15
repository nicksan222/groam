import { defineCapability } from '#backend/assistant/tools/factory';
import { createUpdateActivityTool } from '#backend/assistant/tools/trips/activity';

export const updateActivityCapability = defineCapability({
  create: ({ activeTripId }) => createUpdateActivityTool(activeTripId),
  guidance:
    'Call updateActivity to change an existing activity on a draft idea. Never claim a change unless the tool succeeds.',
  id: 'trip.activity.update',
  toolName: 'updateActivity',
  writeIntent: ['change', 'move', 'rename', 'reschedule', 'update']
});
