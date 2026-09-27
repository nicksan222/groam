import { configuredValue } from '#ai/backend/providers/env';
import { openRouterApiHost } from '#ai/backend/providers/keys';

const CHAT_MAX_OUTPUT_TOKENS = 1024;

/** OpenRouter bills against reserved `max_tokens`; omit the cap so a short reply can complete. */
export function chatAgentCallSettings(openAiBaseUrl: string | undefined): {
  maxOutputTokens?: number;
} {
  const baseURL = configuredValue(openAiBaseUrl)?.toLowerCase() ?? '';
  if (baseURL.includes(openRouterApiHost)) return {};
  return { maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS };
}
