import { ConvexError } from 'convex/values';
import type { AssistantProviderId } from '#ai-contracts/providers/ids';

export type AssistantProviderEnvironment = Partial<{
  AI_AGENT_MODELS: string;
  AI_MODEL: string;
  AI_PROVIDER: AssistantProviderId;
  AI_WEB_SEARCH: string;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_BASE_URL: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
  GOOGLE_GENERATIVE_AI_BASE_URL: string;
  OPENAI_API_KEY: string;
  OPENAI_API_MODE: string;
  OPENAI_BASE_URL: string;
}>;

export function configuredValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function requireApiKey(value: string | undefined, variable: string) {
  const apiKey = configuredValue(value);
  if (!apiKey) throw new ConvexError(`Groam AI is not configured. Add ${variable}.`);
  return apiKey;
}
