import { type AssistantProviderEnvironment, configuredValue } from '#ai-contracts/providers/env';
import type { AssistantProviderId } from '#ai-contracts/providers/ids';

export const aiKeyProviderIds = [
  'openai',
  'anthropic',
  'google',
  'openrouter',
  'compatible'
] as const;
export type AiKeyProviderId = (typeof aiKeyProviderIds)[number];

export type AiKeyCredentials = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  provider: AiKeyProviderId;
};

export type AiKeyProvider = {
  apiKeyEnv: 'ANTHROPIC_API_KEY' | 'GOOGLE_GENERATIVE_AI_API_KEY' | 'OPENAI_API_KEY';
  apiMode?: 'chat' | 'responses';
  baseURL?: string;
  defaultModel?: string;
  hint: string;
  id: AiKeyProviderId;
  keyPlaceholder: string;
  label: string;
  requiresBaseUrl?: boolean;
  runtime: AssistantProviderId;
  webSearch?: boolean;
};

/** Providers a group can save in Settings → AI, including OpenAI-compatible hosts. */
export const aiKeyProviders = [
  {
    apiKeyEnv: 'OPENAI_API_KEY',
    hint: 'Uses OpenAI’s official API.',
    id: 'openai',
    keyPlaceholder: 'sk-…',
    label: 'OpenAI',
    runtime: 'openai'
  },
  {
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    hint: 'Uses Anthropic’s official API.',
    id: 'anthropic',
    keyPlaceholder: 'sk-ant-…',
    label: 'Anthropic',
    runtime: 'anthropic'
  },
  {
    apiKeyEnv: 'GOOGLE_GENERATIVE_AI_API_KEY',
    hint: 'Uses Google Gemini.',
    id: 'google',
    keyPlaceholder: 'AIza…',
    label: 'Google',
    runtime: 'google'
  },
  {
    apiKeyEnv: 'OPENAI_API_KEY',
    apiMode: 'chat',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    hint: 'OpenRouter is OpenAI-compatible. Model ids look like openai/gpt-4o-mini. Web search is off.',
    id: 'openrouter',
    keyPlaceholder: 'sk-or-…',
    label: 'OpenRouter',
    runtime: 'openai',
    webSearch: false
  },
  {
    apiKeyEnv: 'OPENAI_API_KEY',
    apiMode: 'chat',
    baseURL: 'http://127.0.0.1:11434/v1',
    defaultModel: 'llama3.2',
    hint: 'Ollama, LM Studio, vLLM, or any OpenAI-compatible /v1 host. Web search is off.',
    id: 'compatible',
    keyPlaceholder: 'ollama',
    label: 'Local / OpenAI-compatible',
    requiresBaseUrl: true,
    runtime: 'openai',
    webSearch: false
  }
] as const satisfies readonly AiKeyProvider[];

const aiKeyProvidersById = Object.fromEntries(
  aiKeyProviders.map((provider) => [provider.id, provider])
) as Record<AiKeyProviderId, AiKeyProvider>;

export function isAiKeyProviderId(value: unknown): value is AiKeyProviderId {
  return typeof value === 'string' && value in aiKeyProvidersById;
}

export function aiKeyProvider(id: AiKeyProviderId): AiKeyProvider {
  return aiKeyProvidersById[id];
}

function deploymentProviderApiKey(deployment: AssistantProviderEnvironment) {
  const provider = deployment.AI_PROVIDER ?? 'openai';
  if (provider === 'anthropic') return deployment.ANTHROPIC_API_KEY;
  if (provider === 'google') return deployment.GOOGLE_GENERATIVE_AI_API_KEY;
  return deployment.OPENAI_API_KEY;
}

/** True when Convex env already has credentials for the selected provider. */
export function hasDeploymentAiCredentials(deployment: AssistantProviderEnvironment): boolean {
  if (configuredValue(deployment.AI_AGENT_MODELS)) return true;
  return Boolean(configuredValue(deploymentProviderApiKey(deployment)));
}

function applyStoredAiKeys(
  deployment: AssistantProviderEnvironment,
  stored: AiKeyCredentials
): AssistantProviderEnvironment {
  const preset = aiKeyProvider(stored.provider);
  const baseURL = stored.baseUrl ?? preset.baseURL;
  return {
    ...deployment,
    AI_AGENT_MODELS: undefined,
    AI_MODEL: stored.model ?? preset.defaultModel,
    AI_PROVIDER: preset.runtime,
    AI_WEB_SEARCH: preset.webSearch === false ? 'disabled' : undefined,
    ANTHROPIC_BASE_URL: undefined,
    GOOGLE_GENERATIVE_AI_BASE_URL: undefined,
    OPENAI_API_MODE: preset.apiMode,
    OPENAI_BASE_URL: baseURL,
    [preset.apiKeyEnv]: stored.apiKey
  };
}

/**
 * Resolve assistant env: Convex deployment variables first, then a Settings → AI
 * key when those variables are absent. A saved group key owns provider, model,
 * and credentials, and official presets clear leftover custom base URLs so that
 * key is not sent to a proxy.
 */
export function resolveAssistantEnvironment(
  deployment: AssistantProviderEnvironment,
  stored: AiKeyCredentials | null
): AssistantProviderEnvironment {
  if (hasDeploymentAiCredentials(deployment) || !stored) return deployment;
  return applyStoredAiKeys(deployment, stored);
}
