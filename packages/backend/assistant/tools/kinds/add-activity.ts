import { defineCapability } from '#backend/assistant/tools/factory';
import { createAddActivityTool } from '#backend/assistant/tools/trips/activity';

export const addActivityCapability = defineCapability({
  create: ({ activeTripId }) => createAddActivityTool(activeTripId),
  guidance:
    'Call addActivity for each activity on a draft idea. Days must already exist on the stop — call extendItinerary first when the issue adds time. Never claim a change unless the tool succeeds.',
  id: 'trip.activity.add',
  toolName: 'addActivity',
  writeIntent: ['add', 'choose', 'schedule', 'select']
});
