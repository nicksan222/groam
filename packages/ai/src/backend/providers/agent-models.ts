import { type AssistantAgentId, isAssistantAgentId } from '#ai/agents';
import { type AssistantProviderId, isAssistantProviderId } from '#ai/backend/providers/ids';
import { isRecord } from '#ai/runtime/context-tag';

export type AgentModelSelection = {
  model: string;
  provider: AssistantProviderId;
};

export type AgentModelSelections = Partial<Record<AssistantAgentId, AgentModelSelection>>;

export type ParsedAgentModels =
  | { selections: AgentModelSelections; valid: true }
  | { error: string; valid: false };

export function parseAgentModels(raw: string | undefined): ParsedAgentModels {
  if (!raw?.trim()) return { selections: {}, valid: true };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { error: 'AI_AGENT_MODELS must be valid JSON', valid: false };
  }
  if (!isRecord(parsed)) {
    return { error: 'AI_AGENT_MODELS must be a JSON object', valid: false };
  }
  const selections: AgentModelSelections = {};
  for (const [agentId, selection] of Object.entries(parsed)) {
    if (!isAssistantAgentId(agentId)) {
      return { error: `AI_AGENT_MODELS contains unknown agent "${agentId}"`, valid: false };
    }
    if (
      !isRecord(selection) ||
      !isAssistantProviderId(selection.provider) ||
      typeof selection.model !== 'string' ||
      !selection.model.trim()
    ) {
      return {
        error: `AI_AGENT_MODELS.${agentId} must contain a valid provider and non-empty model`,
        valid: false
      };
    }
    selections[agentId] = {
      model: selection.model.trim(),
      provider: selection.provider
    };
  }
  return { selections, valid: true };
}
