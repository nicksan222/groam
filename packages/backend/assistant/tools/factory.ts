import type { AssistantAgentId, AssistantCapability } from '@groam/ai-contracts/agents/registry';
import type { ToolSet } from 'ai';
import type { AssistantScreen } from '#convex/modules/assistant/screen/index';
import type { Id } from '#convex-generated/dataModel';

export type AssistantTool = NonNullable<ToolSet[string]>;

export type AssistantToolScope = 'discussion' | 'private' | 'standalone';

export type AssistantToolRuntime = {
  activeTripId: Id<'trips'> | null;
  agentId: AssistantAgentId;
  prompt: string;
  screen: AssistantScreen;
  scope: AssistantToolScope;
  issueId?: Id<'tripIssues'>;
  providerTools?: ToolSet;
  runId?: Id<'agentRuns'>;
  threadId?: string;
};

export type AssistantToolEventLabel = {
  complete: string;
  running: string;
};

export type AssistantCapabilityRegistration = {
  /** Run-log copy. Omit to humanize `toolName` (`getItinerary` → "Read itinerary"). */
  eventLabel?: AssistantToolEventLabel;
  guidance?: string;
  id: AssistantCapability;
  toolName: string;
  writeIntent?: readonly string[];
  /** Whole-message confirmations after politeness, e.g. `Maybe` / `Not going`. */
  writeIntentExact?: readonly string[];
} & (
  | { create: (runtime: AssistantToolRuntime) => AssistantTool | null; createToolSet?: never }
  | { create?: never; createToolSet: (runtime: AssistantToolRuntime) => ToolSet | null }
);

export function defineCapability<T extends AssistantCapabilityRegistration>(registration: T): T {
  return registration;
}
