import {
  type AssistantProviderEnvironment,
  type AssistantProviderId,
  configuredValue,
  isAssistantProviderId
} from '@groam/ai-contracts/provider';
import { ConvexError } from 'convex/values';
import {
  type AssistantProviderConfiguration,
  AssistantProviderKind
} from '#backend/ai/providers/kind';
import '#backend/ai/providers/kinds/index';
import { type AssistantAgentId, isAssistantAgentId } from '@groam/ai-contracts/agents/registry';

export type { AssistantAgentId } from '@groam/ai-contracts/agents/registry';
export type { AssistantProviderId } from '@groam/ai-contracts/provider';
export type { AssistantProviderConfiguration, AssistantProviderEnvironment };

type AgentModelSelection = {
  model: string;
  provider: AssistantProviderId;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseAgentModels(
  raw: string | undefined
): Partial<Record<AssistantAgentId, AgentModelSelection>> {
  const configured = configuredValue(raw);
  if (!configured) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(configured) as unknown;
  } catch {
    throw new ConvexError('AI_AGENT_MODELS must be valid JSON');
  }
  if (!isRecord(parsed)) throw new ConvexError('AI_AGENT_MODELS must be a JSON object');
  const selections: Partial<Record<AssistantAgentId, AgentModelSelection>> = {};
  for (const [agentId, selection] of Object.entries(parsed)) {
    if (!isAssistantAgentId(agentId)) {
      throw new ConvexError(`AI_AGENT_MODELS contains unknown agent "${agentId}"`);
    }
    if (
      !isRecord(selection) ||
      !isAssistantProviderId(selection.provider) ||
      typeof selection.model !== 'string' ||
      !selection.model.trim()
    ) {
      throw new ConvexError(
        `AI_AGENT_MODELS.${agentId} must contain a valid provider and non-empty model`
      );
    }
    selections[agentId] = {
      model: selection.model.trim(),
      provider: selection.provider
    };
  }
  return selections;
}

function modelSelection(
  agentId: AssistantAgentId,
  configuration: AssistantProviderEnvironment
): AgentModelSelection {
  const override = parseAgentModels(configuration.AI_AGENT_MODELS)[agentId];
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
