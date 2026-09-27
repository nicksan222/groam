import { assistantAgentIds } from '#ai/agents';
import { parseAgentModels } from '#ai/backend/providers/agent-models';
import {
  type AssistantApiKeyEnv,
  type AssistantProviderEnvironment,
  assistantApiKeyEnvs,
  configuredValue,
  providerApiKeyValue
} from '#ai/backend/providers/env';
import {
  type AssistantProviderId,
  assistantProviderIds,
  defaultAssistantProviderId
} from '#ai/backend/providers/ids';

/** Canonical OpenRouter host; call-settings keys its token-cap exemption off this. */
export const openRouterApiHost = 'openrouter.ai';
export const openRouterBaseUrl = `https://${openRouterApiHost}/api/v1`;

/** Key-catalog ids: the three official provider ids plus OpenAI-compatible hosts. */
export const aiKeyProviderIds = [...assistantProviderIds, 'openrouter', 'compatible'] as const;
export type AiKeyProviderId = (typeof aiKeyProviderIds)[number];

export type AiKeyCredentials = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  provider: AiKeyProviderId;
};

export type AiCredentialSource = 'deployment' | 'organization' | 'personal' | 'unconfigured';

export type ResolvedAssistantCredentials = {
  environment: AssistantProviderEnvironment;
  source: AiCredentialSource;
};

export type AiKeyProvider = {
  apiKeyEnv: AssistantApiKeyEnv;
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

/** Shared wiring for OpenAI-compatible hosts (OpenRouter, local servers). */
const openAiCompatibleDefaults = {
  apiKeyEnv: assistantApiKeyEnvs.openai,
  apiMode: 'chat',
  runtime: 'openai',
  webSearch: false
} as const;

/** Providers a group can save in Settings → AI, including OpenAI-compatible hosts. */
export const aiKeyProviders = [
  {
    apiKeyEnv: assistantApiKeyEnvs.openai,
    hint: 'Uses OpenAI’s official API.',
    id: 'openai',
    keyPlaceholder: 'sk-…',
    label: 'OpenAI',
    runtime: 'openai'
  },
  {
    apiKeyEnv: assistantApiKeyEnvs.anthropic,
    hint: 'Uses Anthropic’s official API.',
    id: 'anthropic',
    keyPlaceholder: 'sk-ant-…',
    label: 'Anthropic',
    runtime: 'anthropic'
  },
  {
    apiKeyEnv: assistantApiKeyEnvs.google,
    hint: 'Uses Google Gemini.',
    id: 'google',
    keyPlaceholder: 'AIza…',
    label: 'Google',
    runtime: 'google'
  },
  {
    ...openAiCompatibleDefaults,
    baseURL: openRouterBaseUrl,
    defaultModel: 'openai/gpt-4o-mini',
    hint: 'OpenRouter is OpenAI-compatible. Model ids look like openai/gpt-4o-mini. Web search is off.',
    id: 'openrouter',
    keyPlaceholder: 'sk-or-…',
    label: 'OpenRouter'
  },
  {
    ...openAiCompatibleDefaults,
    baseURL: 'http://127.0.0.1:11434/v1',
    defaultModel: 'llama3.2',
    hint: 'Ollama, LM Studio, vLLM, or any OpenAI-compatible /v1 host. Web search is off.',
    id: 'compatible',
    keyPlaceholder: 'ollama',
    label: 'Local / OpenAI-compatible',
    requiresBaseUrl: true
  }
] as const satisfies readonly AiKeyProvider[];

const aiKeyProvidersById = Object.fromEntries(
  aiKeyProviders.map((provider) => [provider.id, provider])
) as Record<AiKeyProviderId, AiKeyProvider>;

export function isAiKeyProviderId(value: unknown): value is AiKeyProviderId {
  return typeof value === 'string' && Object.hasOwn(aiKeyProvidersById, value);
}

export function aiKeyProvider(id: AiKeyProviderId): AiKeyProvider {
  return aiKeyProvidersById[id];
}

function providerApiKey(deployment: AssistantProviderEnvironment, provider: AssistantProviderId) {
  return providerApiKeyValue(deployment, provider);
}

function requiredDeploymentProviders(raw: string, fallback: AssistantProviderId) {
  const parsed = parseAgentModels(raw);
  if (!parsed.valid) return null;
  const providers = new Set<AssistantProviderId>();
  for (const selection of Object.values(parsed.selections)) {
    if (selection) providers.add(selection.provider);
  }
  if (Object.keys(parsed.selections).length < assistantAgentIds.length) providers.add(fallback);
  return providers;
}

/** True when deployment configuration owns provider selection and has an API key. */
export function hasDeploymentAiCredentials(deployment: AssistantProviderEnvironment): boolean {
  const fallback = deployment.AI_PROVIDER ?? defaultAssistantProviderId;
  const configuredModels = configuredValue(deployment.AI_AGENT_MODELS);
  if (!configuredModels) return Boolean(configuredValue(providerApiKey(deployment, fallback)));
  const providers = requiredDeploymentProviders(configuredModels, fallback);
  if (!providers) return Boolean(configuredValue(providerApiKey(deployment, fallback)));
  return Boolean(
    providers.size > 0 &&
      [...providers].every((provider) => configuredValue(providerApiKey(deployment, provider)))
  );
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
 * Resolve assistant env: deployment credentials first, then personal and organization
 * Settings → AI keys. A saved key owns provider, model,
 * and credentials, and official presets clear leftover custom base URLs so that
 * key is not sent to a proxy.
 */
export function resolveAssistantCredentials(
  deployment: AssistantProviderEnvironment,
  personal: AiKeyCredentials | null,
  organization: AiKeyCredentials | null = null
): ResolvedAssistantCredentials {
  if (hasDeploymentAiCredentials(deployment)) {
    return { environment: deployment, source: 'deployment' };
  }
  const stored = personal ?? organization;
  if (!stored) return { environment: deployment, source: 'unconfigured' };
  return {
    environment: applyStoredAiKeys(deployment, stored),
    source: personal ? 'personal' : 'organization'
  };
}

export function resolveAssistantEnvironment(
  deployment: AssistantProviderEnvironment,
  personal: AiKeyCredentials | null,
  organization: AiKeyCredentials | null = null
): AssistantProviderEnvironment {
  return resolveAssistantCredentials(deployment, personal, organization).environment;
}
