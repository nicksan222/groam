import { assistantAgents, isChatAgent } from '#ai-contracts/agents/registry/definitions';
import { type ChatAgentId, isAssistantAgentId } from '#ai-contracts/agents/registry/ids';
import {
  type AssistantContextTag,
  isRecord,
  parseAssistantContextTag
} from '#ai-contracts/agents/registry/shared';

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
  const rawTags = value.tags ?? [];
  if (
    typeof agent !== 'string' ||
    !isAssistantAgentId(agent) ||
    typeof key !== 'string' ||
    !Array.isArray(rawTags) ||
    !isRecord(target) ||
    typeof title !== 'string'
  ) {
    return null;
  }
  const tags = rawTags.map(parseAssistantContextTag);
  const parsedTarget = parseContextTarget(target);
  const definition = assistantAgents[agent];
  if (tags.some((tag) => tag === null) || !parsedTarget || !isChatAgent(definition)) return null;
  return {
    agent: definition.id,
    key,
    tags: tags as AssistantContextTag[],
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
