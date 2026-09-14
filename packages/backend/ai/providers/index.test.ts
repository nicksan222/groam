import { resolveAssistantEnvironment } from '@groam/ai-contracts/providers/keys';
import { expect, test } from 'vitest';
import { type AssistantProviderEnvironment, configuredAssistantProvider } from './index';

const keys: AssistantProviderEnvironment = {
  ANTHROPIC_API_KEY: 'anthropic-key',
  GOOGLE_GENERATIVE_AI_API_KEY: 'google-key',
  OPENAI_API_KEY: 'openai-key'
};

test('uses typed provider defaults and provider-native web search tools', () => {
  expect(configuredAssistantProvider('groam', keys)).toMatchObject({
    modelId: 'gpt-5-mini',
    providerId: 'openai',
    providerTools: { web_search: expect.any(Object) }
  });
  expect(configuredAssistantProvider('groam', { ...keys, AI_PROVIDER: 'anthropic' })).toMatchObject(
    {
      modelId: 'claude-sonnet-4-5',
      providerId: 'anthropic',
      providerTools: { web_search: expect.any(Object) }
    }
  );
  expect(configuredAssistantProvider('groam', { ...keys, AI_PROVIDER: 'google' })).toMatchObject({
    modelId: 'gemini-2.5-flash',
    providerId: 'google',
    providerTools: { google_search: expect.any(Object) }
  });
});

test('supports a model override for the single Groam agent', () => {
  const configuration = configuredAssistantProvider('groam', {
    ...keys,
    AI_AGENT_MODELS: JSON.stringify({
      groam: { model: 'claude-haiku-4-5', provider: 'anthropic' }
    }),
    AI_MODEL: 'gpt-4.1-mini',
    AI_PROVIDER: 'openai'
  });

  expect(configuration).toMatchObject({
    modelId: 'claude-haiku-4-5',
    providerId: 'anthropic'
  });
});

test('validates provider configuration before creating an Agent', () => {
  expect(() => configuredAssistantProvider('groam', {})).toThrow(
    'Groam AI is not configured. Add OPENAI_API_KEY.'
  );
  expect(() => configuredAssistantProvider('groam', { AI_PROVIDER: 'anthropic' })).toThrow(
    'Groam AI is not configured. Add ANTHROPIC_API_KEY.'
  );
  expect(() => configuredAssistantProvider('groam', { AI_PROVIDER: 'google' })).toThrow(
    'Groam AI is not configured. Add GOOGLE_GENERATIVE_AI_API_KEY.'
  );
  expect(() =>
    configuredAssistantProvider('groam', {
      ...keys,
      AI_AGENT_MODELS: '{invalid'
    })
  ).toThrow('AI_AGENT_MODELS must be valid JSON');
  expect(() =>
    configuredAssistantProvider('groam', {
      ...keys,
      AI_AGENT_MODELS: JSON.stringify({ future: { model: 'x', provider: 'openai' } })
    })
  ).toThrow('AI_AGENT_MODELS contains unknown agent "future"');
});

test('lets the host disable search or use OpenAI chat mode', () => {
  expect(
    configuredAssistantProvider('groam', { ...keys, AI_WEB_SEARCH: 'disabled' }).providerTools
  ).toBeUndefined();
  expect(
    configuredAssistantProvider('groam', { ...keys, OPENAI_API_MODE: 'chat' }).providerTools
  ).toBeUndefined();
});

test('keeps AI_AGENT_MODELS when deployment env is already configured', () => {
  const configuration = resolveAssistantEnvironment(
    {
      ...keys,
      AI_AGENT_MODELS: JSON.stringify({
        groam: { model: 'claude-haiku-4-5', provider: 'anthropic' }
      }),
      AI_PROVIDER: 'anthropic'
    },
    { apiKey: 'sk-or-stored', model: 'openai/gpt-4o-mini', provider: 'openrouter' }
  );

  expect(configuredAssistantProvider('groam', configuration)).toMatchObject({
    modelId: 'claude-haiku-4-5',
    providerId: 'anthropic'
  });
});

test('uses a saved group key when deployment has no credentials', () => {
  const configuration = resolveAssistantEnvironment(
    {},
    { apiKey: 'sk-or-stored', model: 'openai/gpt-4o-mini', provider: 'openrouter' }
  );

  expect(configuredAssistantProvider('groam', configuration)).toMatchObject({
    modelId: 'openai/gpt-4o-mini',
    providerId: 'openai'
  });
  expect(configuredAssistantProvider('groam', configuration).providerTools).toBeUndefined();
});

test('disables web search for a local OpenAI-compatible host', () => {
  const configuration = resolveAssistantEnvironment(
    {},
    {
      apiKey: 'ollama',
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: 'llama3.2',
      provider: 'compatible'
    }
  );
  expect(configuredAssistantProvider('groam', configuration).providerTools).toBeUndefined();
});
