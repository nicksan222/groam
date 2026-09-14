import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  type AssistantProviderEnvironment,
  configuredValue,
  requireApiKey
} from '@groam/ai-contracts/provider';
import {
  type AssistantProviderConfiguration,
  AssistantProviderKind
} from '#backend/ai/providers/kind';

export class GoogleProvider extends AssistantProviderKind {
  constructor() {
    super({ defaultModel: 'gemini-2.5-flash', id: 'google' });
  }

  override configure(
    modelId: string,
    configuration: AssistantProviderEnvironment,
    webSearchEnabled: boolean
  ): Omit<AssistantProviderConfiguration, 'modelId' | 'providerId'> {
    const baseURL = configuredValue(configuration.GOOGLE_GENERATIVE_AI_BASE_URL);
    const provider = createGoogleGenerativeAI({
      apiKey: requireApiKey(
        configuration.GOOGLE_GENERATIVE_AI_API_KEY,
        'GOOGLE_GENERATIVE_AI_API_KEY'
      ),
      ...(baseURL ? { baseURL } : {})
    });
    return {
      languageModel: provider(modelId),
      ...(webSearchEnabled
        ? {
            providerTools: {
              google_search: provider.tools.googleSearch({})
            }
          }
        : {})
    };
  }
}
