import { createOpenAI } from '@ai-sdk/openai';
import {
  type AssistantProviderEnvironment,
  configuredValue,
  requireApiKey
} from '@groam/ai-contracts/provider';
import { compatibleProviderFetch } from '#backend/ai/providers/compatible-fetch';
import {
  type AssistantProviderConfiguration,
  AssistantProviderKind
} from '#backend/ai/providers/kind';

export class OpenAIProvider extends AssistantProviderKind {
  constructor() {
    super({ defaultModel: 'gpt-5-mini', id: 'openai' });
  }

  override configure(
    modelId: string,
    configuration: AssistantProviderEnvironment,
    webSearchEnabled: boolean
  ): Omit<AssistantProviderConfiguration, 'modelId' | 'providerId'> {
    const baseURL = configuredValue(configuration.OPENAI_BASE_URL);
    const provider = createOpenAI({
      apiKey: requireApiKey(configuration.OPENAI_API_KEY, 'OPENAI_API_KEY'),
      ...(baseURL ? { baseURL, fetch: compatibleProviderFetch } : {})
    });
    const apiMode = configuration.OPENAI_API_MODE ?? 'responses';
    return {
      languageModel: apiMode === 'chat' ? provider.chat(modelId) : provider.responses(modelId),
      ...(webSearchEnabled && apiMode === 'responses'
        ? {
            providerTools: {
              web_search: provider.tools.webSearch({
                externalWebAccess: true,
                searchContextSize: 'low'
              })
            }
          }
        : {})
    };
  }
}
