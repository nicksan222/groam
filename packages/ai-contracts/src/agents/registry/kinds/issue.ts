import { defineStandaloneAgent } from '#ai-contracts/agents/registry/kind';

export const issueAgent = defineStandaloneAgent({
  assignable: ['issue'],
  capabilities: [
    'context.screen.read',
    'context.workspace.find',
    'trip.activity.add',
    'trip.activity.remove',
    'trip.activity.update',
    'trip.cost.manage',
    'trip.dates.set',
    'trip.destination.add',
    'trip.destination.remove',
    'trip.destination.schedule',
    'trip.details.update',
    'trip.itinerary.extend',
    'trip.itinerary.read',
    'trip.stay.add',
    'trip.stay.remove',
    'trip.stay.update',
    'trip.status.read',
    'trip.transfer.remove',
    'trip.transfer.set',
    'trip.version.start',
    'web.search'
  ],
  description: 'Works assigned trip issues and reports progress without a chat.',
  id: 'issue',
  label: 'Issue agent',
  policies: [
    'The shared trip is immutable to you. All planning writes must happen in a draft idea and reach the shared trip only after human review, required human approvals, conflict resolution, and application. Start or reopen an idea before writing and use its workingTripId.',
    'Do not stop after starting an idea or reading the itinerary. Make the requested change on the draft with the matching write tools: extend or reschedule stops, add update or remove activities and stays, add or remove destinations, set or remove transfers, and update trip details. An empty draft is not done.',
    'Do not create additional issues assigned to yourself. Do not close the issue you were assigned.',
    'Keep the final report concise: what you changed in the draft idea, and that humans should review and apply it.'
  ]
});
