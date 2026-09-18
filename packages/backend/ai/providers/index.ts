import { type AssistantProviderEnvironment, configuredValue } from '@groam/ai-contracts/provider';
import {
  type AgentModelSelection,
  parseAgentModels
} from '@groam/ai-contracts/providers/agent-models';
import { ConvexError } from 'convex/values';
import {
  type AssistantProviderConfiguration,
  AssistantProviderKind
} from '#backend/ai/providers/kind';
import '#backend/ai/providers/kinds/index';
import type { AssistantAgentId } from '@groam/ai-contracts/agents/registry';

export type { AssistantAgentId } from '@groam/ai-contracts/agents/registry';
export type { AssistantProviderId } from '@groam/ai-contracts/provider';
export type { AssistantProviderConfiguration, AssistantProviderEnvironment };

function modelSelection(
  agentId: AssistantAgentId,
  configuration: AssistantProviderEnvironment
): AgentModelSelection {
  const parsed = parseAgentModels(configuration.AI_AGENT_MODELS);
  if (!parsed.valid) throw new ConvexError(parsed.error);
  const override = parsed.selections[agentId];
  if (override) return override;
  const provider = configuration.AI_PROVIDER ?? 'openai';
  const kind = AssistantProviderKind.of(provider);
  if (!kind) throw new ConvexError(`Unknown assistant provider "${provider}"`);
  return {
    model: configuredValue(configuration.AI_MODEL) ?? kind.defaultModel,
    provider
  };
}

/**
 * Resolves the language model and provider-native tools for an agent.
 * Provider adapters live in `kinds/`; this facade does not import that map.
 */
export function configuredAssistantProvider(
  agentId: AssistantAgentId,
  configuration: AssistantProviderEnvironment
): AssistantProviderConfiguration {
  const selection = modelSelection(agentId, configuration);
  const kind = AssistantProviderKind.of(selection.provider);
  if (!kind) throw new ConvexError(`Unknown assistant provider "${selection.provider}"`);
  return {
    ...kind.configure(selection.model, configuration, configuration.AI_WEB_SEARCH !== 'disabled'),
    modelId: selection.model,
    providerId: selection.provider
  };
}
