import { defineCapability } from '#backend/assistant/tools/factory';
import { createSetTripDatesTool } from '#backend/assistant/tools/trips/dates';

export const setTripDatesCapability = defineCapability({
  create: ({ activeTripId }) => createSetTripDatesTool(activeTripId),
  guidance:
    'When the traveler explicitly provides trip dates, call setTripDates exactly once and then confirm success. Never archive or restore a trip while setting dates.',
  id: 'trip.dates.set',
  toolName: 'setTripDates',
  writeIntent: [
    'change dates',
    'change the dates',
    'change trip dates',
    'save dates',
    'save the dates',
    'save trip dates',
    'set dates',
    'set the dates',
    'set these dates',
    'set this trip',
    'set trip dates',
    'use these dates',
    'update dates',
    'update the dates',
    'update trip dates'
  ]
});
