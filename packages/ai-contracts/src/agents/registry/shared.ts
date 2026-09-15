import {
  type AssistantContextTagKind,
  AssistantContextTags
} from '#ai-contracts/agents/registry/tags';

export type AssistantContextTag = {
  id: string;
  kind: AssistantContextTagKind;
  label: string;
  tripId: string;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseAssistantContextTag(value: unknown): AssistantContextTag | null {
  if (!isRecord(value)) return null;
  const { id, kind, label, tripId } = value;
  if (
    typeof id !== 'string' ||
    typeof kind !== 'string' ||
    !AssistantContextTags.isKind(kind) ||
    typeof label !== 'string' ||
    typeof tripId !== 'string'
  ) {
    return null;
  }
  return { id, kind, label, tripId };
}
