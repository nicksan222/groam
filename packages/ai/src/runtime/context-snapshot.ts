import { assistantAgents, type ChatAgentId, isAssistantAgentId } from '#ai/agents/catalog';
import { isChatAgent } from '#ai/agents/definition';
import {
  type AssistantContextTag,
  isRecord,
  parseAssistantContextTags
} from '#ai/runtime/context-tag';

export type AssistantContextSnapshot = {
  agent: ChatAgentId;
  key: string;
  tags: AssistantContextTag[];
  target: { kind: 'workspace' } | { kind: 'trip'; section: string; tripId: string };
  title: string;
};

const CONTEXT_MESSAGE_PREFIX = 'Groam interaction context (JSON):\n';
const LEGACY_CONTEXT_MESSAGE_PREFIX = 'Groam screen context snapshot (JSON):\n';

export function assistantContextMessage(snapshot: AssistantContextSnapshot): string {
  return `${CONTEXT_MESSAGE_PREFIX}${JSON.stringify(snapshot)}`;
}

function contextPrefix(message: string): string | null {
  if (message.startsWith(CONTEXT_MESSAGE_PREFIX)) return CONTEXT_MESSAGE_PREFIX;
  if (message.startsWith(LEGACY_CONTEXT_MESSAGE_PREFIX)) return LEGACY_CONTEXT_MESSAGE_PREFIX;
  return null;
}

function parseContextTarget(
  target: Record<string, unknown>
): AssistantContextSnapshot['target'] | null {
  if (target.kind === 'workspace') return { kind: 'workspace' };
  if (
    target.kind === 'trip' &&
    typeof target.section === 'string' &&
    typeof target.tripId === 'string'
  ) {
    return { kind: 'trip', section: target.section, tripId: target.tripId };
  }
  return null;
}

function parseContextSnapshot(value: unknown): AssistantContextSnapshot | null {
  if (!isRecord(value)) return null;
  const { agent, key, target, title } = value;
  if (
    typeof agent !== 'string' ||
    !isAssistantAgentId(agent) ||
    typeof key !== 'string' ||
    !isRecord(target) ||
    typeof title !== 'string'
  ) {
    return null;
  }
  const tags = parseAssistantContextTags(value.tags ?? []);
  const parsedTarget = parseContextTarget(target);
  const definition = assistantAgents[agent];
  if (tags === null || !parsedTarget || !isChatAgent(definition)) return null;
  return {
    agent: definition.id,
    key,
    tags,
    target: parsedTarget,
    title
  };
}

export function parseAssistantContextMessage(message: string): AssistantContextSnapshot | null {
  const prefix = contextPrefix(message);
  if (!prefix) return null;
  try {
    return parseContextSnapshot(JSON.parse(message.slice(prefix.length)) as unknown);
  } catch {
    return null;
  }
}
