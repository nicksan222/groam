import type { AssistantAgentDefinition } from '#ai/agents/definition';
import type { AssistantAgentId } from '#ai/agents/ids';

/**
 * A tool definition: the single source of truth for one assistant tool.
 * `agents` says which agents may call it; capability lists and the id
 * catalog derive from these entries. Executable wiring (`create`) stays one
 * binding row per spec in `packages/backend/assistant/tools/kinds/index.ts`.
 */
export type AgentToolEventLabel = {
  complete: string;
  running: string;
};

/**
 * How a tool renders. `activity` is the timeline card, `choice` is the
 * tappable-answers card, `hidden` suppresses the card entirely. Required, so
 * adding a tool forces its UI decision — there is no implicit default.
 */
export type AgentToolCard = 'activity' | 'choice' | 'hidden';

export type AgentToolUi = {
  card: AgentToolCard;
};

export type AgentToolSpecBase = {
  /** Agents allowed to call this tool. Catalog order: groam, issue, reviewer. */
  agents: readonly AssistantAgentId[];
  /** Prompt guidance: every tool teaches the model when to call it. */
  guidance: string;
  id: string;
  /** Required presentation facet — no default, so each tool declares its card. */
  ui: AgentToolUi;
  toolName: string;
};

/** Read-only tool: carries no write intent, so run-log copy stays optional. */
export type AgentToolReadSpec = AgentToolSpecBase & {
  eventLabel?: AgentToolEventLabel;
  writeIntent?: never;
  writeIntentExact?: never;
};

/**
 * Write tool: a `writeIntent` entry forces `guidance` (inherited) plus
 * `eventLabel` run-log copy, so an executable tool is never mute or unlabeled.
 */
export type AgentToolWriteSpec = AgentToolSpecBase & {
  eventLabel: AgentToolEventLabel;
  writeIntent: readonly string[];
  /** Whole-message confirmations after politeness, e.g. `Maybe` / `Not going`. */
  writeIntentExact?: readonly string[];
};

export type AgentToolSpec = AgentToolReadSpec | AgentToolWriteSpec;

export type AssistantCapability = keyof typeof assistantToolSpecs;

export const assistantToolSpecs = {
  // The wait tools only steer the calling agent's own run, so they declare no write intent.
  'agent.wait.cancel': {
    agents: ['groam', 'issue'],
    eventLabel: { complete: 'Cancelled a wait', running: 'Cancelling a wait' },
    guidance:
      'Use cancelWait when a pending wait listed for this chat or run is no longer needed, for example the group already decided in conversation.',
    id: 'agent.wait.cancel',
    toolName: 'cancelWait',
    ui: { card: 'activity' }
  },
  'agent.wait.create': {
    agents: ['groam', 'issue'],
    eventLabel: { complete: 'Started waiting', running: 'Setting up a wait' },
    guidance:
      'Use waitFor when you cannot finish until something happens later: a timer to check back, a poll, a trip issue to be resolved, an idea to be approved or decided, or enough travelers going on the active trip (members who have not RSVPed count as going). Always choose a sensible deadline (at most 14 days). After calling it, stop; you resume automatically with the outcome.',
    id: 'agent.wait.create',
    toolName: 'waitFor',
    ui: { card: 'activity' }
  },
  'context.chat.read': {
    ui: { card: 'activity' },
    agents: ['groam'],
    guidance: 'Call getChatContext when saved AI chat attachments may help answer the request.',
    id: 'context.chat.read',
    toolName: 'getChatContext'
  },
  'context.chat.set': {
    ui: { card: 'activity' },
    agents: ['groam'],
    eventLabel: { complete: 'Updated chat context', running: 'Updating chat context' },
    guidance:
      'When asked to attach or switch context, call findWorkspaceContext before setChatContext.',
    id: 'context.chat.set',
    toolName: 'setChatContext',
    writeIntent: ['attach', 'connect', 'detach', 'remove', 'switch', 'tag']
  },
  'context.screen.read': {
    ui: { card: 'hidden' },
    agents: ['groam', 'issue'],
    guidance:
      'When a request could refer to the current page, call getScreenContext first and use its target as the default. Never ask the traveler which trip they mean when the returned target already identifies one. Use findWorkspaceContext only when the traveler names or clearly implies something else.',
    id: 'context.screen.read',
    toolName: 'getScreenContext'
  },
  'context.workspace.find': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue', 'reviewer', 'researcher'],
    guidance:
      'Use findWorkspaceContext only when neither the screen nor current AI chat attachments identify the required entity. Never invent entity ids.',
    id: 'context.workspace.find',
    toolName: 'findWorkspaceContext'
  },
  // Exempt from the write-intent gate by design: agents ask the group on their own, and a poll is
  // harmless and reversible.
  'poll.create': {
    agents: ['groam', 'issue'],
    eventLabel: { complete: 'Asked the group', running: 'Creating a poll' },
    guidance:
      'Use createPoll when a decision affects everyone in the group and you need their preferences instead of guessing. Keep options short (2–10). Add waitFor to resume automatically: allVoted for small binding choices, optionVotes majority for quick picks, quorum for large groups, closed when the organizer will close it. Always set a sensible deadline (hours for quick picks, a few days for bigger decisions, at most 14 days). After creating a poll with waitFor, stop; you continue with the result.',
    id: 'poll.create',
    toolName: 'createPoll',
    ui: { card: 'activity' }
  },
  'research.run': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue', 'reviewer'],
    eventLabel: { complete: 'Research report received', running: 'Asking researcher' },
    guidance:
      'When planning or reviewing depends on current external facts, uncertain logistics, or comparing options, call researchTopic with a concrete question and the appropriate effort. Use its cited findings and caveats to continue your task. Do not ask the traveler to do the research. Quick checks a narrow question; standard compares options; deep investigates complex decisions. Avoid repeating a question already answered by available research.',
    id: 'research.run',
    toolName: 'researchTopic'
  },
  'research.list': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue', 'reviewer', 'researcher'],
    guidance:
      'Call listResearches to find a trip’s researches (id, title, brief, last activity) before reading, posting to, or linking one.',
    id: 'research.list',
    toolName: 'listResearches'
  },
  'research.read': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue', 'reviewer', 'researcher'],
    guidance:
      'Call readResearch for a research’s brief, linked trip items, and recent messages. Use it before summarizing or adding to one.',
    id: 'research.read',
    toolName: 'readResearch'
  },
  'research.create': {
    ui: { card: 'activity' },
    agents: ['groam'],
    eventLabel: { complete: 'Created research', running: 'Creating research' },
    guidance:
      'Call createResearch to start a trip research on one subject, with an optional brief. Never claim it exists unless the tool succeeds.',
    id: 'research.create',
    toolName: 'createResearch',
    writeIntent: ['create ... research', 'new research', 'open ... research', 'start ... research']
  },
  'research.post': {
    ui: { card: 'activity' },
    agents: ['groam'],
    eventLabel: { complete: 'Posted to research', running: 'Posting to research' },
    guidance:
      'Call postToResearch to save findings or a summary as a message in an existing research thread. Read the research first and post only what the traveler asked for.',
    id: 'research.post',
    toolName: 'postToResearch',
    writeIntent: ['add ... to ... research', 'post ... research', 'save ... research']
  },
  'research.link': {
    ui: { card: 'activity' },
    agents: ['groam', 'researcher'],
    eventLabel: { complete: 'Updated research links', running: 'Updating research links' },
    guidance:
      'Call linkResearch to link or unlink a research to an issue, idea, destination, activity, or stay of its trip. Use exact ids from the research or trip tools.',
    id: 'research.link',
    toolName: 'linkResearch',
    writeIntent: ['attach ... research', 'link ... research', 'unlink ... research']
  },
  'trip.activity.add': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'Call addActivity for each activity on a draft idea. Days must already exist on the stop — call extendItinerary first when the issue adds time. Never claim a change unless the tool succeeds.',
    eventLabel: { complete: 'Added activity', running: 'Adding activity' },
    id: 'trip.activity.add',
    toolName: 'addActivity',
    writeIntent: ['add', 'choose', 'schedule', 'select']
  },
  'trip.activity.remove': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'Call removeActivity to delete an existing activity from a draft idea. Never claim a removal unless the tool succeeds.',
    eventLabel: { complete: 'Removed activity', running: 'Removing activity' },
    id: 'trip.activity.remove',
    toolName: 'removeActivity',
    writeIntent: ['cancel', 'delete', 'drop', 'remove']
  },
  'trip.activity.update': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'Call updateActivity to change an existing activity on a draft idea. Never claim a change unless the tool succeeds.',
    eventLabel: { complete: 'Updated activity', running: 'Updating activity' },
    id: 'trip.activity.update',
    toolName: 'updateActivity',
    writeIntent: ['change', 'move', 'rename', 'reschedule', 'update']
  },
  'trip.cost.manage': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'Use setItineraryCost only for an explicitly requested cost change after reading getItinerary.',
    eventLabel: { complete: 'Updated trip cost', running: 'Updating trip cost' },
    id: 'trip.cost.manage',
    toolName: 'setItineraryCost',
    writeIntent: ['budget', 'cost', 'price', 'spend']
  },
  'trip.create': {
    ui: { card: 'activity' },
    agents: ['groam'],
    guidance:
      'Call createTripProposal only after the traveler explicitly asks to create a trip and its name is clear.',
    eventLabel: { complete: 'Created trip proposal', running: 'Creating trip proposal' },
    id: 'trip.create',
    toolName: 'createTripProposal',
    writeIntent: ['build', 'create', 'make', 'start']
  },
  'trip.dates.set': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'When the traveler explicitly provides trip dates, call setTripDates exactly once and then confirm success. Never archive or restore a trip while setting dates.',
    eventLabel: { complete: 'Updated trip dates', running: 'Updating trip dates' },
    id: 'trip.dates.set',
    toolName: 'setTripDates',
    writeIntent: [
      'change ... dates',
      'move ... trip',
      'move ... dates',
      'reschedule ... trip',
      'save ... dates',
      'set ... dates',
      'set this trip',
      'shift ... dates',
      'update ... dates',
      'use these dates'
    ]
  },
  'trip.destination.add': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'Call addDestination only with a verified placeId and coordinates. Never invent a place. Never claim a stop was added unless the tool succeeds.',
    eventLabel: { complete: 'Added destination', running: 'Adding destination' },
    id: 'trip.destination.add',
    toolName: 'addDestination',
    writeIntent: [
      'add ... city',
      'add ... destination',
      'add ... stop',
      'another city',
      'another stop'
    ]
  },
  'trip.destination.remove': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    eventLabel: { complete: 'Removed destination', running: 'Removing destination' },
    guidance:
      'Call removeDestination to drop a stop from a draft idea. This also removes that stop’s activities and stays. Never claim a removal unless the tool succeeds.',
    id: 'trip.destination.remove',
    toolName: 'removeDestination',
    // Bare verbs: "Remove Porto" names no keyword. The model confirms before
    // this cascading delete, and a short "yes" completes it.
    writeIntent: ['delete', 'drop', 'remove']
  },
  'trip.destination.schedule': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'Call setDestinationSchedule to set a stop’s day range on a draft idea. Prefer extendItinerary when only adding days at the end of the last stop. Never claim a schedule change unless the tool succeeds.',
    eventLabel: {
      complete: 'Updated destination schedule',
      running: 'Updating destination schedule'
    },
    id: 'trip.destination.schedule',
    toolName: 'setDestinationSchedule',
    writeIntent: ['move days', 'reschedule stop', 'set days', 'shift days']
  },
  'trip.details.update': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'Call updateTripDetails to change a draft idea’s name, budget, date notes, or total days. Never claim a change unless the tool succeeds.',
    eventLabel: { complete: 'Updated trip details', running: 'Updating trip details' },
    id: 'trip.details.update',
    toolName: 'updateTripDetails',
    writeIntent: ['budget', 'rename', 'trip name', 'update details']
  },
  'trip.issue.create': {
    ui: { card: 'activity' },
    agents: ['groam'],
    guidance:
      'Use createTripIssue when the traveler wants to capture planning work for the Issue agent without implementing it yet. Issues queue standalone work; implementations belong in trip ideas.',
    eventLabel: { complete: 'Created trip issue', running: 'Creating trip issue' },
    id: 'trip.issue.create',
    toolName: 'createTripIssue',
    writeIntent: ['assign', 'create ... issue', 'file ... issue', 'open ... issue', 'track']
  },
  'trip.itinerary.extend': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'Call extendItinerary on a draft idea when adding days to a stop. Use the last stop for time at the end of the trip, then addActivity on the new days. Never claim extra days unless the tool succeeds.',
    eventLabel: { complete: 'Extended itinerary', running: 'Extending itinerary' },
    id: 'trip.itinerary.extend',
    toolName: 'extendItinerary',
    writeIntent: [
      'add ... days',
      'add ... extra day',
      'add ... more day',
      'add a day',
      'add one day',
      'another day',
      'extend',
      'extra day',
      'longer trip',
      'one more day'
    ]
  },
  'trip.itinerary.read': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue', 'reviewer', 'researcher'],
    guidance:
      'Use getItinerary before discussing a route, schedule, stops, stays, activities, transport, budget, or itemized costs.',
    id: 'trip.itinerary.read',
    toolName: 'getItinerary'
  },
  'trip.packing.manage': {
    ui: { card: 'activity' },
    agents: ['groam'],
    guidance:
      'Call managePacking to add a group item with a quantity, change its quantity or name, remove it, or set how many one traveler is bringing, in an editable idea. Start or reopen an idea first, use its workingTripId, and read its packing list for item and traveler ids. Personal packing lists are private and not available. Changes reach the shared trip only after approval and applying the idea.',
    eventLabel: { complete: 'Updated packing list', running: 'Updating packing list' },
    id: 'trip.packing.manage',
    toolName: 'managePacking',
    writeIntent: [
      'add',
      'assign',
      'bring',
      'bringing',
      'change ... packing',
      'change the packing',
      'delete ... packing',
      'delete the packing',
      'need',
      'remove',
      'rename',
      'update ... packing',
      'update the packing',
      'who brings',
      'will bring'
    ]
  },
  'trip.packing.personal.manage': {
    ui: { card: 'activity' },
    agents: ['groam'],
    guidance:
      'Call manageMyPacking to add, rename, tick (packed), untick, or remove items on the requesting traveler’s own private packing list. It is live (no idea needed), acts only for the traveler you are chatting with, and never changes the group list. Use managePacking for items the whole group needs. Read it first with listMyPacking to get item ids.',
    eventLabel: { complete: 'Updated your packing list', running: 'Updating your packing list' },
    id: 'trip.packing.personal.manage',
    toolName: 'manageMyPacking',
    writeIntent: [
      'add ... my',
      'add ... to my',
      'check off',
      'delete ... my',
      'mark packed',
      'mark as packed',
      'my list',
      'my packing',
      'pack',
      'packed',
      'remove ... my',
      'rename ... my',
      'tick',
      'uncheck',
      'unpack',
      'untick'
    ]
  },
  'trip.packing.personal.read': {
    ui: { card: 'activity' },
    agents: ['groam'],
    guidance:
      'Call listMyPacking to read the requesting traveler’s own private packing list. Only available in private chats; never repeat personal items in a shared thread.',
    id: 'trip.packing.personal.read',
    toolName: 'listMyPacking'
  },
  'trip.packing.read': {
    ui: { card: 'activity' },
    agents: ['groam'],
    guidance:
      'Call listPacking to read the group packing list for the requested trip or idea: each item needed quantity and who is bringing it. Before editing, read the working idea to get its item ids.',
    id: 'trip.packing.read',
    toolName: 'listPacking'
  },
  'trip.stay.add': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'Call addStay only after the traveler explicitly confirms the accommodation and destination.',
    eventLabel: { complete: 'Added stay', running: 'Adding stay' },
    id: 'trip.stay.add',
    toolName: 'addStay',
    writeIntent: [
      'add ... accommodation',
      'add ... hotel',
      'add ... stay',
      'book ... accommodation',
      'book ... hotel',
      'book ... stay',
      'stay at',
      'stay in'
    ]
  },
  'trip.stay.remove': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'Call removeStay to delete an existing stay from a draft idea. Never claim a removal unless the tool succeeds.',
    eventLabel: { complete: 'Removed stay', running: 'Removing stay' },
    id: 'trip.stay.remove',
    toolName: 'removeStay',
    writeIntent: [
      'cancel ... hotel',
      'cancel ... stay',
      'delete ... hotel',
      'delete ... stay',
      'drop ... hotel',
      'drop ... stay',
      'remove ... hotel',
      'remove ... stay'
    ]
  },
  'trip.stay.update': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'Call updateStay to change an existing stay on a draft idea. Never claim a change unless the tool succeeds.',
    eventLabel: { complete: 'Updated stay', running: 'Updating stay' },
    id: 'trip.stay.update',
    toolName: 'updateStay',
    writeIntent: [
      'change ... hotel',
      'change ... stay',
      'switch ... hotel',
      'swap ... hotel',
      'update ... hotel',
      'update ... stay'
    ]
  },
  'trip.status.read': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue', 'reviewer', 'researcher'],
    guidance:
      'Use getTripStatus for readiness, dates, decisions, approvals, travelers, or next steps.',
    id: 'trip.status.read',
    toolName: 'getTripStatus'
  },
  'trip.traveler.set': {
    ui: { card: 'activity' },
    agents: ['groam'],
    guidance:
      'Call setTravelerRsvp when the traveler confirms going, maybe, or not going. Default to the current traveler unless they name someone else.',
    eventLabel: { complete: 'Updated RSVP', running: 'Updating RSVP' },
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
  },
  'trip.transfer.remove': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'Call removeTransfer to delete arrival, departure, between-stop, or between-activity travel from a draft idea. Never claim a removal unless the tool succeeds.',
    eventLabel: { complete: 'Removed transfer', running: 'Removing transfer' },
    id: 'trip.transfer.remove',
    toolName: 'removeTransfer',
    writeIntent: [
      'cancel ... flight',
      'cancel ... train',
      'delete ... flight',
      'remove ... flight',
      'remove ... train',
      'remove ... transfer',
      'remove ... travel'
    ]
  },
  'trip.transfer.set': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'Call setTransfer to set arrival, departure, between-stop, or between-activity travel on a draft idea. Never claim travel was saved unless the tool succeeds.',
    eventLabel: { complete: 'Updated transfer', running: 'Updating transfer' },
    id: 'trip.transfer.set',
    toolName: 'setTransfer',
    writeIntent: [
      'arrival',
      'departure',
      'flight',
      'train',
      'transfer',
      'travel between',
      'travel home',
      'travel to'
    ]
  },
  'trip.version.apply': {
    ui: { card: 'activity' },
    agents: ['groam'],
    guidance:
      'Call applyTripVersion only after the traveler asks to apply or merge an approved idea into the shared trip. If the idea is still a draft, tell them it needs review and approvals first.',
    eventLabel: { complete: 'Applied trip idea', running: 'Applying trip idea' },
    id: 'trip.version.apply',
    toolName: 'applyTripVersion',
    writeIntent: [
      'apply',
      'apply the idea',
      'apply this idea',
      'merge',
      'go ahead and merge',
      'please merge'
    ]
  },
  'trip.version.approve': {
    ui: { card: 'activity' },
    agents: ['groam'],
    guidance:
      'Call approveTripVersion when the traveler wants to approve or withdraw approval on an idea that is in review. Authors cannot approve their own idea when independent human reviewers were requested; otherwise self-approval is allowed.',
    eventLabel: { complete: 'Updated idea approval', running: 'Updating idea approval' },
    id: 'trip.version.approve',
    toolName: 'approveTripVersion',
    writeIntent: ['approve', 'revoke', 'withdraw']
  },
  'trip.version.start': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue'],
    guidance:
      'The shared trip itinerary is immutable to Groam. Before any trip-detail, date, itinerary, stay, activity, packing, or cost write, call startTripVersion, read the returned idea, and make every write against that workingTripId. When the active context is already an idea working copy, startTripVersion reopens that idea and must not create another idea from it. When assigned an issue, startTripVersion links the draft idea to that issue. Groam cannot archive, restore, or directly edit the shared itinerary. After review, Groam can approve and apply an idea when the traveler asks. Group packing changes, including who is bringing what, require an idea and approval. Traveler RSVPs write to the shared trip. Tell the traveler draft itinerary changes still await human review unless they asked to apply.',
    eventLabel: { complete: 'Started trip idea', running: 'Starting trip idea' },
    id: 'trip.version.start',
    toolName: 'startTripVersion',
    // Prerequisite of every idea write, so it must cover every write verb the
    // tools above gate on.
    writeIntent: [
      'add',
      'another',
      'arrival',
      'book',
      'budget',
      'cancel',
      'change',
      'check off',
      'choose',
      'cost',
      'delete',
      'departure',
      'drop',
      'edit',
      'extend',
      'extra day',
      'flight',
      'longer trip',
      'mark',
      'move',
      'one more day',
      'pack',
      'plan',
      'price',
      'remove',
      'rename',
      'reschedule',
      'save',
      'schedule',
      'set',
      'shift',
      'spend',
      'swap',
      'switch',
      'train',
      'transfer',
      'unpack',
      'update'
    ]
  },
  'ui.askUserChoice': {
    agents: ['groam'],
    guidance:
      'Use askUserChoice only when one missing decision blocks a useful answer and provide exactly three short predefined answers; the interface provides a fourth custom text answer. Do not use it to defer a requested review, suggestion, recommendation, summary, or explanation. Use the generated form format for multiple fields or mixed input types. Do not select for the traveler.',
    id: 'ui.askUserChoice',
    toolName: 'askUserChoice',
    ui: { card: 'choice' }
  },
  'web.search': {
    ui: { card: 'activity' },
    agents: ['groam', 'issue', 'reviewer', 'researcher'],
    guidance:
      'For planning questions, use web search when current external information would improve the answer.',
    id: 'web.search',
    toolName: 'webSearch'
  }
} as const satisfies Record<string, AgentToolSpec>;

/** Capability ids in catalog order, derived from the spec keys. */
const specIdList = Object.keys(assistantToolSpecs) as AssistantCapability[];

export const assistantToolSpecList: readonly AgentToolSpec[] = specIdList.map(
  (id) => assistantToolSpecs[id]
);

/** Capability ids allowed for one agent, in catalog order. */
export function capabilitiesForAgent(agentId: AssistantAgentId): AssistantCapability[] {
  // `.some` (not `.includes`): `agents` infers as a literal tuple, whose
  // `includes` rejects the wider id union at compile time.
  return specIdList.filter((id) => assistantToolSpecs[id].agents.some((a) => a === agentId));
}

/** Specs for one agent's tools, in catalog order. */
export function toolSpecsFor(agent: AssistantAgentDefinition): readonly AgentToolSpec[] {
  const allowed = new Set<AssistantCapability>(agent.capabilities);
  return assistantToolSpecList.filter((spec) => allowed.has(spec.id as AssistantCapability));
}

const specByToolName = new Map(assistantToolSpecList.map((spec) => [spec.toolName, spec]));

/** Spec for a runtime tool name, or null for provider tools outside the catalog. */
export function specForToolName(toolName: string): AgentToolSpec | null {
  return specByToolName.get(toolName) ?? null;
}

/** Render card for a runtime tool name. Unknown (provider) tools use `activity`. */
export function cardForToolName(toolName: string): AgentToolCard {
  return specForToolName(toolName)?.ui.card ?? 'activity';
}
