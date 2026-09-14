import { createAnthropic } from '@ai-sdk/anthropic';
import {
  type AssistantProviderEnvironment,
  configuredValue,
  requireApiKey
} from '@groam/ai-contracts/provider';
import {
  type AssistantProviderConfiguration,
  AssistantProviderKind
} from '#backend/ai/providers/kind';

export class AnthropicProvider extends AssistantProviderKind {
  constructor() {
    super({ defaultModel: 'claude-sonnet-4-5', id: 'anthropic' });
  }

  override configure(
    modelId: string,
    configuration: AssistantProviderEnvironment,
    webSearchEnabled: boolean
  ): Omit<AssistantProviderConfiguration, 'modelId' | 'providerId'> {
    const baseURL = configuredValue(configuration.ANTHROPIC_BASE_URL);
    const provider = createAnthropic({
      apiKey: requireApiKey(configuration.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY'),
      ...(baseURL ? { baseURL } : {})
    });
    return {
      languageModel: provider(modelId),
      ...(webSearchEnabled
        ? {
            providerTools: {
              web_search: provider.tools.webSearch_20250305({ maxUses: 5 })
            }
          }
        : {})
    };
  }
}
