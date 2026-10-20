import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV4 } from '@ai-sdk/provider';
import { wrapLanguageModel } from 'ai';
import type { ToolSet } from 'ai';
import { ConvexError } from 'convex/values';
import { chatGptFetch } from '#backend/ai/chatgpt/responses-fetch';
export type AssistantProviderConfiguration = {
  languageModel: LanguageModelV4;
  modelId: string;
  providerTools?: ToolSet;
};
/** Uses the selected user's ChatGPT grant; deployment API keys are never consulted. */
export function configuredChatGptProvider(input: {
  accessToken: string;
  model: string;
  fetch?: typeof globalThis.fetch;
  searchContextSize?: 'low' | 'medium' | 'high';
}): AssistantProviderConfiguration {
  if (!input.accessToken.trim() || !input.model.trim())
    throw new ConvexError('Connect ChatGPT and select an available model to use Groam AI.');
  const provider = createOpenAI({
    apiKey: input.accessToken,
    baseURL: 'https://api.openai.com/v1',
    fetch: input.fetch ?? chatGptFetch
  });
  return {
    languageModel: wrapLanguageModel({
      model: provider.responses(input.model),
      middleware: {
        specificationVersion: 'v4',
        transformParams: async ({ params }) => ({
          ...params,
          providerOptions: {
            ...params.providerOptions,
            openai: { ...params.providerOptions?.openai, store: false }
          }
        })
      }
    }),
    modelId: input.model,
    providerTools: {
      web_search: provider.tools.webSearch({
        externalWebAccess: true,
        searchContextSize: input.searchContextSize ?? 'low'
      })
    }
  };
}
