import { defineCapability } from '#backend/assistant/tools/factory';
import { createSetTravelerRsvpTool } from '#backend/assistant/tools/trips/workflow';

export const setTravelerRsvpCapability = defineCapability({
  create: ({ activeTripId }) => createSetTravelerRsvpTool(activeTripId),
  guidance:
    'Call setTravelerRsvp when the traveler confirms going, maybe, or not going. Default to the current traveler unless they name someone else.',
  id: 'trip.traveler.set',
  toolName: 'setTravelerRsvp',
  writeIntent: [
    'change rsvp',
    "i can't go",
    'i cannot go',
    'i am going',
    'i am not going',
    "i'll go",
    "i'm going",
    "i'm not going",
    "i won't go",
    'mark as going',
    'mark as maybe',
    'mark as not going',
    'mark me as going',
    'mark me as maybe',
    'mark me as not going',
    'set my rsvp',
    'set rsvp',
    'update my rsvp',
    'update rsvp'
  ],
  writeIntentExact: ['going', 'maybe', 'not going']
});
