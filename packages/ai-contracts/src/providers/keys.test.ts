import { describe, expect, test } from 'vitest';
import {
  hasDeploymentAiCredentials,
  isAiKeyProviderId,
  resolveAssistantCredentials,
  resolveAssistantEnvironment
} from './keys';

describe('hasDeploymentAiCredentials', () => {
  test('is true when the selected provider has a key', () => {
    expect(hasDeploymentAiCredentials({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'env-key' })).toBe(
      true
    );
    expect(
      hasDeploymentAiCredentials({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-ant' })
    ).toBe(true);
  });

  test('requires at least one deployment key when AI_AGENT_MODELS selects providers', () => {
    expect(
      hasDeploymentAiCredentials({
        AI_AGENT_MODELS: JSON.stringify({ groam: { model: 'gpt-4.1-mini', provider: 'openai' } })
      })
    ).toBe(false);
    expect(
      hasDeploymentAiCredentials({
        AI_AGENT_MODELS: JSON.stringify({
          groam: { model: 'claude-haiku-4-5', provider: 'anthropic' },
          issue: { model: 'claude-haiku-4-5', provider: 'anthropic' },
          reviewer: { model: 'claude-haiku-4-5', provider: 'anthropic' }
        }),
        ANTHROPIC_API_KEY: 'env-ant'
      })
    ).toBe(true);
    expect(
      hasDeploymentAiCredentials({
        AI_AGENT_MODELS: JSON.stringify({
          groam: { model: 'claude-haiku-4-5', provider: 'anthropic' }
        }),
        ANTHROPIC_API_KEY: 'env-ant'
      })
    ).toBe(false);
    expect(
      hasDeploymentAiCredentials({
        AI_AGENT_MODELS: JSON.stringify({
          groam: { model: 'claude-haiku-4-5', provider: 'anthropic' }
        }),
        ANTHROPIC_API_KEY: 'env-ant',
        OPENAI_API_KEY: 'env-openai'
      })
    ).toBe(true);
  });

  test('is false when the selected provider has no key', () => {
    expect(hasDeploymentAiCredentials({})).toBe(false);
    expect(hasDeploymentAiCredentials({ AI_PROVIDER: 'openai', OPENAI_API_KEY: '  ' })).toBe(false);
    expect(
      hasDeploymentAiCredentials({
        AI_PROVIDER: 'openai',
        ANTHROPIC_API_KEY: 'sk-ant'
      })
    ).toBe(false);
  });

  test('keeps malformed per-agent configuration deployment-owned when fallback is credentialed', () => {
    const deployment = {
      AI_AGENT_MODELS: '{invalid',
      AI_PROVIDER: 'anthropic' as const,
      ANTHROPIC_API_KEY: 'env-ant'
    };
    expect(hasDeploymentAiCredentials(deployment)).toBe(true);
    expect(
      resolveAssistantCredentials(deployment, {
        apiKey: 'sk-personal',
        provider: 'openai'
      })
    ).toEqual({ environment: deployment, source: 'deployment' });
  });
});

describe('resolveAssistantEnvironment', () => {
  test('returns the deployment environment when nothing is stored', () => {
    const deployment = { AI_PROVIDER: 'openai' as const, OPENAI_API_KEY: 'env-key' };
    expect(resolveAssistantEnvironment(deployment, null)).toEqual(deployment);
  });

  test('gives deployment credentials priority over a personal key', () => {
    const deployment = { AI_PROVIDER: 'openai' as const, OPENAI_API_KEY: 'env-key' };
    expect(
      resolveAssistantEnvironment(deployment, {
        apiKey: 'sk-ant-stored',
        provider: 'anthropic'
      })
    ).toEqual(deployment);
  });

  test('uses stored credentials when deployment has no provider key', () => {
    expect(
      resolveAssistantEnvironment({}, { apiKey: 'sk-ant-stored', provider: 'anthropic' })
    ).toMatchObject({
      AI_PROVIDER: 'anthropic',
      ANTHROPIC_API_KEY: 'sk-ant-stored'
    });
  });

  test('wires OpenRouter through the OpenAI-compatible host when env is empty', () => {
    expect(
      resolveAssistantEnvironment({}, { apiKey: 'sk-or-stored', provider: 'openrouter' })
    ).toEqual({
      AI_AGENT_MODELS: undefined,
      AI_MODEL: 'openai/gpt-4o-mini',
      AI_PROVIDER: 'openai',
      ANTHROPIC_BASE_URL: undefined,
      GOOGLE_GENERATIVE_AI_BASE_URL: undefined,
      OPENAI_API_KEY: 'sk-or-stored',
      OPENAI_API_MODE: 'chat',
      OPENAI_BASE_URL: 'https://openrouter.ai/api/v1',
      AI_WEB_SEARCH: 'disabled'
    });
  });

  test('lets OpenRouter keep a custom model id', () => {
    expect(
      resolveAssistantEnvironment(
        {},
        { apiKey: 'sk-or-stored', model: 'anthropic/claude-sonnet-4', provider: 'openrouter' }
      )
    ).toMatchObject({
      AI_MODEL: 'anthropic/claude-sonnet-4',
      AI_PROVIDER: 'openai',
      OPENAI_API_MODE: 'chat'
    });
  });

  test('clears OpenRouter compatibility fields when switching back to OpenAI', () => {
    expect(
      resolveAssistantEnvironment(
        {
          AI_MODEL: 'openai/gpt-4o-mini',
          AI_PROVIDER: 'openai',
          OPENAI_API_MODE: 'chat',
          OPENAI_BASE_URL: 'https://openrouter.ai/api/v1'
        },
        { apiKey: 'sk-openai', provider: 'openai' }
      )
    ).toEqual({
      AI_AGENT_MODELS: undefined,
      AI_MODEL: undefined,
      AI_PROVIDER: 'openai',
      ANTHROPIC_BASE_URL: undefined,
      GOOGLE_GENERATIVE_AI_BASE_URL: undefined,
      OPENAI_API_KEY: 'sk-openai',
      OPENAI_API_MODE: undefined,
      OPENAI_BASE_URL: undefined,
      AI_WEB_SEARCH: undefined
    });
  });

  test('wires a local OpenAI-compatible host and disables web search', () => {
    expect(
      resolveAssistantEnvironment(
        {},
        {
          apiKey: 'ollama',
          baseUrl: 'http://127.0.0.1:11434/v1',
          model: 'llama3.2',
          provider: 'compatible'
        }
      )
    ).toMatchObject({
      AI_MODEL: 'llama3.2',
      AI_PROVIDER: 'openai',
      AI_WEB_SEARCH: 'disabled',
      OPENAI_API_KEY: 'ollama',
      OPENAI_API_MODE: 'chat',
      OPENAI_BASE_URL: 'http://127.0.0.1:11434/v1'
    });
  });

  test('lets dashboard env keep per-agent models when nothing is stored', () => {
    const deployment = {
      AI_AGENT_MODELS: JSON.stringify({
        groam: { model: 'claude-haiku-4-5', provider: 'anthropic' }
      }),
      AI_PROVIDER: 'openai' as const,
      ANTHROPIC_API_KEY: 'env-ant',
      OPENAI_API_KEY: 'env-openai'
    };
    expect(resolveAssistantEnvironment(deployment, null)).toEqual(deployment);
  });

  test('gives deployment per-agent models priority over a personal key', () => {
    const deployment = {
      AI_AGENT_MODELS: JSON.stringify({
        groam: { model: 'claude-haiku-4-5', provider: 'anthropic' }
      }),
      AI_PROVIDER: 'anthropic' as const,
      ANTHROPIC_API_KEY: 'env-ant',
      OPENAI_API_KEY: 'env-openai'
    };
    expect(
      resolveAssistantEnvironment(deployment, {
        apiKey: 'sk-or-stored',
        provider: 'openrouter'
      })
    ).toEqual(deployment);
  });

  test('does not send an official key to a custom provider host', () => {
    expect(
      resolveAssistantEnvironment(
        {
          ANTHROPIC_BASE_URL: 'https://proxy.example/anthropic',
          GOOGLE_GENERATIVE_AI_BASE_URL: 'https://proxy.example/google',
          OPENAI_BASE_URL: 'https://proxy.example/openai'
        },
        { apiKey: 'sk-ant-official', provider: 'anthropic' }
      )
    ).toMatchObject({
      ANTHROPIC_API_KEY: 'sk-ant-official',
      ANTHROPIC_BASE_URL: undefined,
      GOOGLE_GENERATIVE_AI_BASE_URL: undefined,
      OPENAI_BASE_URL: undefined
    });
  });
});

describe('resolveAssistantCredentials', () => {
  const organization = { apiKey: 'sk-shared', provider: 'openai' as const };
  const personal = { apiKey: 'sk-personal', provider: 'anthropic' as const };

  test('reports the centralized deployment, personal, organization, and empty sources', () => {
    expect(
      resolveAssistantCredentials(
        { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'env-key' },
        personal,
        organization
      ).source
    ).toBe('deployment');
    expect(resolveAssistantCredentials({}, personal, organization).source).toBe('personal');
    expect(resolveAssistantCredentials({}, null, organization).source).toBe('organization');
    expect(resolveAssistantCredentials({}, null, null).source).toBe('unconfigured');
  });

  test('personal credentials win over organization credentials in the resolved environment', () => {
    expect(resolveAssistantCredentials({}, personal, organization)).toMatchObject({
      environment: { AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-personal' },
      source: 'personal'
    });
  });
});

describe('isAiKeyProviderId', () => {
  test('accepts catalog ids including OpenRouter and local compatible hosts', () => {
    expect(isAiKeyProviderId('openrouter')).toBe(true);
    expect(isAiKeyProviderId('compatible')).toBe(true);
    expect(isAiKeyProviderId('openai')).toBe(true);
    expect(isAiKeyProviderId('together')).toBe(false);
  });
});
