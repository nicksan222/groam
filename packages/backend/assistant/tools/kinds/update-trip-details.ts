import { defineCapability } from '#backend/assistant/tools/factory';
import { createUpdateTripDetailsTool } from '#backend/assistant/tools/trips/details';

export const updateTripDetailsCapability = defineCapability({
  create: ({ activeTripId }) => createUpdateTripDetailsTool(activeTripId),
  guidance:
    'Call updateTripDetails to change a draft idea’s name, budget, date notes, or total days. Never claim a change unless the tool succeeds.',
  id: 'trip.details.update',
  toolName: 'updateTripDetails',
  writeIntent: ['budget', 'rename', 'trip name', 'update details']
});
