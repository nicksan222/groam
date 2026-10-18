import type { AssistantCapability } from '#ai/agents';
import type { AssistantTripSection } from '#ai/runtime/screen';

export type TripSection = AssistantTripSection;

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
    // Plain string on purpose: backend document ids are branded strings, and
    // this package must not import the backend's generated id types. Callers
    // holding an `Id<'trips'>` can still pass it — brands assign to strings.
    tripId: string;
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
