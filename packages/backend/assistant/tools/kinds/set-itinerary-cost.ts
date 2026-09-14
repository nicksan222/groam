import { defineCapability } from '#backend/assistant/tools/factory';
import { createSetItineraryCostTool } from '#backend/assistant/tools/trips/costs';

export const setItineraryCostCapability = defineCapability({
  create: ({ activeTripId }) => createSetItineraryCostTool(activeTripId),
  guidance:
    'Use setItineraryCost only for an explicitly requested cost change after reading getItinerary.',
  id: 'trip.cost.manage',
  toolName: 'setItineraryCost',
  writeIntent: ['budget', 'cost', 'price', 'spend']
});
