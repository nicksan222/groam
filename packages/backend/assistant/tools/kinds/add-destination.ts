import { defineCapability } from '#backend/assistant/tools/factory';
import { createAddDestinationTool } from '#backend/assistant/tools/trips/destinations';

export const addDestinationCapability = defineCapability({
  create: ({ activeTripId }) => createAddDestinationTool(activeTripId),
  guidance:
    'Call addDestination only with a verified placeId and coordinates. Never invent a place. Never claim a stop was added unless the tool succeeds.',
  id: 'trip.destination.add',
  toolName: 'addDestination',
  writeIntent: ['add a city', 'add a stop', 'add destination', 'another city', 'another stop']
});
