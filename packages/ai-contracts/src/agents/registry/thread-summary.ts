import {
  type AssistantContextTag,
  isRecord,
  parseAssistantContextTag
} from '#ai-contracts/agents/registry/shared';

export type AssistantThreadSummary = {
  kind: 'workspace-assistant';
  organizationId: string;
  screenContext?: string;
  tags: AssistantContextTag[];
  updatedAt?: number;
  version: 1 | 2;
};

export function assistantThreadSummary(
  organizationId: string,
  tags: readonly AssistantContextTag[],
  updatedAt: number,
  screenContext?: string
): string {
  return JSON.stringify({
    kind: 'workspace-assistant',
    organizationId,
    ...(screenContext ? { screenContext } : {}),
    tags: [...tags],
    updatedAt,
    version: 2
  } satisfies AssistantThreadSummary);
}

export function parseAssistantThreadSummary(
  summary: string | undefined
): AssistantThreadSummary | null {
  if (!summary) return null;
  try {
    const value: unknown = JSON.parse(summary);
    if (
      !isRecord(value) ||
      value.kind !== 'workspace-assistant' ||
      typeof value.organizationId !== 'string'
    ) {
      return null;
    }
    const rawTags = value.tags ?? [];
    if (
      !Array.isArray(rawTags) ||
      (value.updatedAt !== undefined && typeof value.updatedAt !== 'number')
    ) {
      return null;
    }
    const tags = rawTags.map(parseAssistantContextTag);
    if (tags.some((tag) => tag === null)) return null;
    return {
      kind: 'workspace-assistant',
      organizationId: value.organizationId,
      tags: tags as AssistantContextTag[],
      ...(typeof value.screenContext === 'string' ? { screenContext: value.screenContext } : {}),
      ...(typeof value.updatedAt === 'number' ? { updatedAt: value.updatedAt } : {}),
      version: value.version === 2 ? 2 : 1
    };
  } catch {
    return null;
  }
}
