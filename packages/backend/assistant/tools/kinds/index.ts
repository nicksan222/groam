import type { AssistantCapability } from '@groam/ai-contracts/agents/registry';
import type { AssistantCapabilityRegistration } from '#backend/assistant/tools/factory';
import { AssistantToolKind } from '#backend/assistant/tools/kind';
import { addActivityCapability } from '#backend/assistant/tools/kinds/add-activity';
import { addDestinationCapability } from '#backend/assistant/tools/kinds/add-destination';
import { addStayCapability } from '#backend/assistant/tools/kinds/add-stay';
import { applyTripVersionCapability } from '#backend/assistant/tools/kinds/apply-trip-version';
import { approveTripVersionCapability } from '#backend/assistant/tools/kinds/approve-trip-version';
import { askUserChoiceCapability } from '#backend/assistant/tools/kinds/ask-user-choice';
import { createTripIssueCapability } from '#backend/assistant/tools/kinds/create-trip-issue';
import { createTripProposalCapability } from '#backend/assistant/tools/kinds/create-trip-proposal';
import { extendItineraryCapability } from '#backend/assistant/tools/kinds/extend-itinerary';
import { findWorkspaceContextCapability } from '#backend/assistant/tools/kinds/find-workspace-context';
import { getChatContextCapability } from '#backend/assistant/tools/kinds/get-chat-context';
import { getItineraryCapability } from '#backend/assistant/tools/kinds/get-itinerary';
import { getScreenContextCapability } from '#backend/assistant/tools/kinds/get-screen-context';
import { getTripStatusCapability } from '#backend/assistant/tools/kinds/get-trip-status';
import { listPackingCapability } from '#backend/assistant/tools/kinds/list-packing';
import { managePackingCapability } from '#backend/assistant/tools/kinds/manage-packing';
import { removeActivityCapability } from '#backend/assistant/tools/kinds/remove-activity';
import { removeDestinationCapability } from '#backend/assistant/tools/kinds/remove-destination';
import { removeStayCapability } from '#backend/assistant/tools/kinds/remove-stay';
import { removeTransferCapability } from '#backend/assistant/tools/kinds/remove-transfer';
import { setChatContextCapability } from '#backend/assistant/tools/kinds/set-chat-context';
import { setDestinationScheduleCapability } from '#backend/assistant/tools/kinds/set-destination-schedule';
import { setItineraryCostCapability } from '#backend/assistant/tools/kinds/set-itinerary-cost';
import { setTransferCapability } from '#backend/assistant/tools/kinds/set-transfer';
import { setTravelerRsvpCapability } from '#backend/assistant/tools/kinds/set-traveler-rsvp';
import { setTripDatesCapability } from '#backend/assistant/tools/kinds/set-trip-dates';
import { startTripVersionCapability } from '#backend/assistant/tools/kinds/start-trip-version';
import { updateActivityCapability } from '#backend/assistant/tools/kinds/update-activity';
import { updateStayCapability } from '#backend/assistant/tools/kinds/update-stay';
import { updateTripDetailsCapability } from '#backend/assistant/tools/kinds/update-trip-details';
import { webSearchCapability } from '#backend/assistant/tools/kinds/web-search';

/**
 * Capability catalog. Adding a tool is this map plus `defineCapability` —
 * run logs record usage from `toolName` / `eventLabel`. Do not add a second
 * tool-name or event-kind map.
 */
const assistantCapabilityRegistrations = {
  'context.chat.read': getChatContextCapability,
  'context.chat.set': setChatContextCapability,
  'context.screen.read': getScreenContextCapability,
  'context.workspace.find': findWorkspaceContextCapability,
  'trip.activity.add': addActivityCapability,
  'trip.activity.remove': removeActivityCapability,
  'trip.activity.update': updateActivityCapability,
  'trip.cost.manage': setItineraryCostCapability,
  'trip.create': createTripProposalCapability,
  'trip.dates.set': setTripDatesCapability,
  'trip.destination.add': addDestinationCapability,
  'trip.destination.remove': removeDestinationCapability,
  'trip.destination.schedule': setDestinationScheduleCapability,
  'trip.details.update': updateTripDetailsCapability,
  'trip.issue.create': createTripIssueCapability,
  'trip.itinerary.extend': extendItineraryCapability,
  'trip.itinerary.read': getItineraryCapability,
  'trip.packing.manage': managePackingCapability,
  'trip.packing.read': listPackingCapability,
  'trip.stay.add': addStayCapability,
  'trip.stay.remove': removeStayCapability,
  'trip.stay.update': updateStayCapability,
  'trip.status.read': getTripStatusCapability,
  'trip.traveler.set': setTravelerRsvpCapability,
  'trip.transfer.remove': removeTransferCapability,
  'trip.transfer.set': setTransferCapability,
  'trip.version.apply': applyTripVersionCapability,
  'trip.version.approve': approveTripVersionCapability,
  'trip.version.start': startTripVersionCapability,
  'ui.askUserChoice': askUserChoiceCapability,
  'web.search': webSearchCapability
} as const satisfies Record<AssistantCapability, AssistantCapabilityRegistration>;

for (const registration of Object.values(assistantCapabilityRegistrations)) {
  AssistantToolKind.subscribe(registration);
}
