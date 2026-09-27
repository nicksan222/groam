export const assistantProviderIds = ['openai', 'anthropic', 'google'] as const;
export type AssistantProviderId = (typeof assistantProviderIds)[number];

/** Fallback when AI_PROVIDER is unset; single source for the default. */
export const defaultAssistantProviderId: AssistantProviderId = 'openai';

export function isAssistantProviderId(value: unknown): value is AssistantProviderId {
  return typeof value === 'string' && assistantProviderIds.some((id) => id === value);
}
