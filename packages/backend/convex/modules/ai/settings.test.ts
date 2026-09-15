import {
  hasDeploymentAiCredentials,
  resolveAssistantEnvironment
} from '@groam/ai-contracts/providers/keys';
import { expect, test } from 'vitest';
import { readAiSettings } from '#convex/modules/ai/settings';
import { api, internal } from '#convex-generated/api';
import { env } from '#convex-generated/server';
import { createOutsiderClient } from '#testing/factory';
import { setupGroup } from '#testing/trips';

function publicSettings(
  overrides: {
    baseUrl?: string | null;
    canManage?: boolean;
    configured?: boolean;
    model?: string | null;
    provider?: 'anthropic' | 'compatible' | 'google' | 'openai' | 'openrouter' | null;
  } = {}
) {
  return {
    baseUrl: null,
    canManage: true,
    configured: false,
    fromEnvironment: hasDeploymentAiCredentials(env),
    model: null,
    provider: null,
    ...overrides
  };
}

test('saves an OpenRouter key without returning the secret', async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Traveler');
  const organizationId = owner.organizationId;
  if (!organizationId) throw new Error('Expected an organization');

  await expect(
    member.client.mutation(api.routes.settings.ai.set.run, {
      apiKey: 'sk-member',
      baseUrl: null,
      model: null,
      provider: 'openai'
    })
  ).rejects.toThrow('Only organization owners and admins can manage group settings');

  await owner.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: 'sk-or-private',
    baseUrl: null,
    model: 'anthropic/claude-sonnet-4',
    provider: 'openrouter'
  });

  const settings = await owner.client.query(api.routes.settings.ai.get.run, {});
  expect(settings).toEqual(
    publicSettings({
      baseUrl: 'https://openrouter.ai/api/v1',
      configured: true,
      model: 'anthropic/claude-sonnet-4',
      provider: 'openrouter'
    })
  );
  expect(JSON.stringify(settings)).not.toContain('sk-or-private');

  await expect(member.client.query(api.routes.settings.ai.get.run, {})).resolves.toEqual(
    publicSettings({
      baseUrl: 'https://openrouter.ai/api/v1',
      canManage: false,
      configured: true,
      model: 'anthropic/claude-sonnet-4',
      provider: 'openrouter'
    })
  );

  const stored = await owner.test.query(internal.modules.ai.settings.stored, { organizationId });
  expect(stored).toEqual({
    apiKey: 'sk-or-private',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-sonnet-4',
    provider: 'openrouter'
  });

  const storedCredentials = await owner.client.run((ctx) => readAiSettings(ctx, organizationId));
  expect(resolveAssistantEnvironment({}, storedCredentials)).toMatchObject({
    AI_MODEL: 'anthropic/claude-sonnet-4',
    AI_PROVIDER: 'openai',
    OPENAI_API_KEY: 'sk-or-private',
    OPENAI_API_MODE: 'chat',
    OPENAI_BASE_URL: 'https://openrouter.ai/api/v1'
  });
  if (hasDeploymentAiCredentials(env)) {
    expect(resolveAssistantEnvironment(env, storedCredentials)).toEqual(env);
  }

  await owner.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: null,
    baseUrl: null,
    model: null,
    provider: 'openrouter'
  });
  await expect(owner.client.query(api.routes.settings.ai.get.run, {})).resolves.toEqual(
    publicSettings()
  );
});

test('keeps a saved key private to its group', async () => {
  const { owner } = await setupGroup();
  const outsider = await createOutsiderClient(owner.test);

  await owner.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: 'sk-group-one',
    baseUrl: null,
    model: null,
    provider: 'openai'
  });

  await expect(outsider.client.query(api.routes.settings.ai.get.run, {})).resolves.toEqual(
    publicSettings()
  );
});

test('updates the model without replacing the stored key', async () => {
  const { owner } = await setupGroup();
  const organizationId = owner.organizationId;
  if (!organizationId) throw new Error('Expected an organization');

  await owner.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: 'sk-keep',
    baseUrl: null,
    model: 'gpt-4.1-mini',
    provider: 'openai'
  });
  await owner.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: '',
    baseUrl: null,
    model: 'gpt-4.1',
    provider: 'openai'
  });

  await expect(owner.client.query(api.routes.settings.ai.get.run, {})).resolves.toEqual(
    publicSettings({ configured: true, model: 'gpt-4.1', provider: 'openai' })
  );
  await expect(
    owner.test.query(internal.modules.ai.settings.stored, { organizationId })
  ).resolves.toMatchObject({
    apiKey: 'sk-keep',
    model: 'gpt-4.1',
    provider: 'openai'
  });
});

test('refuses a provider change unless a new key is pasted', async () => {
  const { owner } = await setupGroup();

  await owner.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: 'sk-keep',
    baseUrl: null,
    model: null,
    provider: 'openai'
  });
  await expect(
    owner.client.mutation(api.routes.settings.ai.set.run, {
      apiKey: '',
      baseUrl: null,
      model: null,
      provider: 'anthropic'
    })
  ).rejects.toThrow('Paste an API key for the selected provider.');
});

test('saves a local OpenAI-compatible host without returning the secret', async () => {
  const { owner } = await setupGroup();
  const organizationId = owner.organizationId;
  if (!organizationId) throw new Error('Expected an organization');

  await owner.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: '',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'llama3.2',
    provider: 'compatible'
  });

  await expect(owner.client.query(api.routes.settings.ai.get.run, {})).resolves.toEqual(
    publicSettings({
      baseUrl: 'http://127.0.0.1:11434/v1',
      configured: true,
      model: 'llama3.2',
      provider: 'compatible'
    })
  );

  const stored = await owner.test.query(internal.modules.ai.settings.stored, { organizationId });
  expect(stored).toEqual({
    apiKey: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'llama3.2',
    provider: 'compatible'
  });
  expect(resolveAssistantEnvironment({}, stored)).toMatchObject({
    AI_WEB_SEARCH: 'disabled',
    OPENAI_API_MODE: 'chat',
    OPENAI_BASE_URL: 'http://127.0.0.1:11434/v1'
  });
});

test('rejects a non-http compatible base URL', async () => {
  const { owner } = await setupGroup();
  await expect(
    owner.client.mutation(api.routes.settings.ai.set.run, {
      apiKey: 'ollama',
      baseUrl: 'ftp://127.0.0.1/v1',
      model: null,
      provider: 'compatible'
    })
  ).rejects.toThrow('The OpenAI-compatible base URL must use http or https.');
});

test('requires a base URL for a compatible host', async () => {
  const { owner } = await setupGroup();
  await expect(
    owner.client.mutation(api.routes.settings.ai.set.run, {
      apiKey: 'ollama',
      baseUrl: null,
      model: null,
      provider: 'compatible'
    })
  ).rejects.toThrow('Paste the OpenAI-compatible base URL.');
});

test('does not keep a local base URL after switching to OpenAI', async () => {
  const { owner } = await setupGroup();
  const organizationId = owner.organizationId;
  if (!organizationId) throw new Error('Expected an organization');

  await owner.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'llama3.2',
    provider: 'compatible'
  });
  await owner.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: 'sk-openai',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: null,
    provider: 'openai'
  });

  const stored = await owner.test.query(internal.modules.ai.settings.stored, { organizationId });
  expect(stored).toEqual({
    apiKey: 'sk-openai',
    provider: 'openai'
  });
});

test('does not keep an official key after switching to a compatible host', async () => {
  const { owner } = await setupGroup();
  const organizationId = owner.organizationId;
  if (!organizationId) throw new Error('Expected an organization');

  await owner.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: 'sk-keep',
    baseUrl: null,
    model: null,
    provider: 'openai'
  });
  await expect(
    owner.client.mutation(api.routes.settings.ai.set.run, {
      apiKey: '',
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: null,
      provider: 'compatible'
    })
  ).rejects.toThrow('Paste an API key for the selected provider.');
});
