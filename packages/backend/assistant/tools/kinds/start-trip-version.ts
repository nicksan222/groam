import { defineCapability } from '#backend/assistant/tools/factory';
import { createStartTripVersionTool } from '#backend/assistant/tools/trips/version';

export const startTripVersionCapability = defineCapability({
  create: ({ activeTripId, issueId, runId }) =>
    createStartTripVersionTool(activeTripId, { issueId, runId }),
  guidance:
    'The shared trip itinerary is immutable to Groam. Before any trip-detail, date, itinerary, stay, activity, packing, or cost write, call startTripVersion, read the returned idea, and make every write against that workingTripId. When the active context is already an idea working copy, startTripVersion reopens that idea and must not create another idea from it. When assigned an issue, startTripVersion links the draft idea to that issue. Groam cannot archive, restore, or directly edit the shared itinerary. After review, Groam can approve and apply an idea when the traveler asks. Packing changes, including check-offs, require an idea and approval. Traveler RSVPs write to the shared trip. Tell the traveler draft itinerary changes still await human review unless they asked to apply.',
  id: 'trip.version.start',
  toolName: 'startTripVersion',
  writeIntent: ['add', 'change', 'choose', 'edit', 'plan', 'save', 'schedule', 'set', 'update']
});
