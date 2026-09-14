import type { AssistantCapability } from '@groam/ai-contracts/agents/registry';
import type { Id } from '@groam/backend/data-model';

export type TripSection = 'activity' | 'ideas' | 'issues' | 'itinerary' | 'overview' | 'versions';

export type AgentContextData =
  | boolean
  | null
  | number
  | string
  | AgentContextData[]
  | { [key: string]: AgentContextData };

export type AgentScreenContext = {
  capabilities: AssistantCapability[];
  data: AgentContextData;
  description: string;
  key: string;
  target?: {
    kind: 'trip';
    section: TripSection;
    tripId: Id<'trips'>;
  };
  title: string;
};

export function serializeAgentScreenContext(context: AgentScreenContext) {
  return {
    capabilities: context.capabilities,
    data: JSON.stringify(context.data),
    description: context.description,
    key: context.key,
    target: context.target ?? { kind: 'workspace' as const },
    title: context.title
  };
}
