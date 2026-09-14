export const assistantCapabilityIds = [
  'context.chat.read',
  'context.chat.set',
  'context.screen.read',
  'context.workspace.find',
  'trip.activity.add',
  'trip.activity.remove',
  'trip.activity.update',
  'trip.cost.manage',
  'trip.create',
  'trip.dates.set',
  'trip.destination.add',
  'trip.destination.remove',
  'trip.destination.schedule',
  'trip.details.update',
  'trip.issue.create',
  'trip.itinerary.extend',
  'trip.itinerary.read',
  'trip.packing.manage',
  'trip.packing.read',
  'trip.stay.add',
  'trip.stay.remove',
  'trip.stay.update',
  'trip.status.read',
  'trip.traveler.set',
  'trip.transfer.remove',
  'trip.transfer.set',
  'trip.version.apply',
  'trip.version.approve',
  'trip.version.start',
  'ui.askUserChoice',
  'web.search'
] as const;

export type AssistantCapability = (typeof assistantCapabilityIds)[number];
export type AssistantToolActivityReceiptId = `${AssistantCapability}.done`;

export const chatAgentIds = ['groam'] as const;
export const standaloneAgentIds = ['issue', 'reviewer'] as const;
export const assistantAgentIds = [...chatAgentIds, ...standaloneAgentIds] as const;

export type ChatAgentId = (typeof chatAgentIds)[number];
export type StandaloneAgentId = (typeof standaloneAgentIds)[number];
export type AssistantAgentId = (typeof assistantAgentIds)[number];

const agentAssignableTargets = ['issue', 'proposal'] as const;
export type AgentAssignableTarget = (typeof agentAssignableTargets)[number];

export function isAssistantAgentId(value: string): value is AssistantAgentId {
  return assistantAgentIds.some((id) => id === value);
}

export function assistantCapabilityReceipt(
  id: AssistantCapability
): AssistantToolActivityReceiptId {
  return `${id}.done`;
}
