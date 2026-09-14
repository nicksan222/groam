export const assistantProviderIds = ['openai', 'anthropic', 'google'] as const;
export type AssistantProviderId = (typeof assistantProviderIds)[number];

export function isAssistantProviderId(value: unknown): value is AssistantProviderId {
  return typeof value === 'string' && assistantProviderIds.some((id) => id === value);
}
