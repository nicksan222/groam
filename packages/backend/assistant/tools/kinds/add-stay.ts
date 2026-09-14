import { defineCapability } from '#backend/assistant/tools/factory';
import { createAddStayTool } from '#backend/assistant/tools/trips/stays';

export const addStayCapability = defineCapability({
  create: ({ activeTripId }) => createAddStayTool(activeTripId),
  guidance:
    'Call addStay only after the traveler explicitly confirms the accommodation and destination.',
  id: 'trip.stay.add',
  toolName: 'addStay',
  writeIntent: ['accommodation', 'add', 'book', 'hotel', 'stay']
});
