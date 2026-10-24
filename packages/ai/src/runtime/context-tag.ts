import { type AssistantContextTagKind, isAssistantContextTagKind } from '#ai/runtime/tags';

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
    !isAssistantContextTagKind(kind) ||
    typeof label !== 'string' ||
    typeof tripId !== 'string'
  ) {
    return null;
  }
  return { id, kind, label, tripId };
}

/** Parses a tag list; null when the value is not an array or any entry is invalid. */
export function parseAssistantContextTags(value: unknown): AssistantContextTag[] | null {
  if (!Array.isArray(value)) return null;
  const tags: AssistantContextTag[] = [];
  for (const entry of value) {
    const tag = parseAssistantContextTag(entry);
    if (tag === null) return null;
    tags.push(tag);
  }
  return tags;
}
