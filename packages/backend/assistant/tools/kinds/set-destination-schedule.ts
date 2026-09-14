import { defineCapability } from '#backend/assistant/tools/factory';
import { createSetDestinationScheduleTool } from '#backend/assistant/tools/trips/destinations';

export const setDestinationScheduleCapability = defineCapability({
  create: ({ activeTripId }) => createSetDestinationScheduleTool(activeTripId),
  guidance:
    'Call setDestinationSchedule to set a stop’s day range on a draft idea. Prefer extendItinerary when only adding days at the end of the last stop. Never claim a schedule change unless the tool succeeds.',
  id: 'trip.destination.schedule',
  toolName: 'setDestinationSchedule',
  writeIntent: ['move days', 'reschedule stop', 'set days', 'shift days']
});
