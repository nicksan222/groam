import { defineCapability } from '#backend/assistant/tools/factory';
import { createExtendItineraryTool } from '#backend/assistant/tools/trips/extend';

export const extendItineraryCapability = defineCapability({
  create: ({ activeTripId }) => createExtendItineraryTool(activeTripId),
  guidance:
    'Call extendItinerary on a draft idea when adding days to a stop. Use the last stop for time at the end of the trip, then addActivity on the new days. Never claim extra days unless the tool succeeds.',
  id: 'trip.itinerary.extend',
  toolName: 'extendItinerary',
  writeIntent: [
    'add a day',
    'add days',
    'add one day',
    'another day',
    'extend',
    'extra day',
    'longer trip',
    'one more day'
  ]
});
