import { defineCapability } from '#backend/assistant/tools/factory';
import { createRemoveDestinationTool } from '#backend/assistant/tools/trips/destinations';

export const removeDestinationCapability = defineCapability({
  create: ({ activeTripId }) => createRemoveDestinationTool(activeTripId),
  guidance:
    'Call removeDestination to drop a stop from a draft idea. This also removes that stop’s activities and stays. Never claim a removal unless the tool succeeds.',
  id: 'trip.destination.remove',
  toolName: 'removeDestination',
  writeIntent: ['drop a stop', 'remove a city', 'remove a stop', 'remove destination']
});
