import { defineCapability } from '#backend/assistant/tools/factory';
import { createGetItineraryTool } from '#backend/assistant/tools/trips/reads';

export const getItineraryCapability = defineCapability({
  create: ({ activeTripId }) => createGetItineraryTool(activeTripId),
  guidance:
    'Use getItinerary before discussing a route, schedule, stops, stays, activities, transport, budget, or itemized costs.',
  id: 'trip.itinerary.read',
  toolName: 'getItinerary'
});
