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
    effectiveSource?: 'deployment' | 'organization' | 'personal' | 'unconfigured';
    model?: string | null;
    provider?: 'anthropic' | 'compatible' | 'google' | 'openai' | 'openrouter' | null;
  } = {}
) {
  const personal = {
    baseUrl: overrides.baseUrl ?? null,
    configured: overrides.configured ?? false,
    model: overrides.model ?? null,
    provider: overrides.provider ?? null
  };
  return {
    canManageOrganization: overrides.canManage ?? true,
    effectiveSource:
      overrides.effectiveSource ??
      (hasDeploymentAiCredentials(env)
        ? 'deployment'
        : overrides.configured
          ? 'personal'
          : 'unconfigured'),
    environmentConfigured: hasDeploymentAiCredentials(env),
    organizationId: expect.any(String),
    organization: { baseUrl: null, configured: false, model: null, provider: null },
    personal
  };
}

test('each member saves a personal OpenRouter key without returning the secret', async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Traveler');

  await member.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: 'sk-member',
    baseUrl: null,
    model: null,
    provider: 'openai'
  });

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
      canManage: false,
      configured: true,
      provider: 'openai'
    })
  );

  const stored = await owner.test.query(internal.modules.ai.settings.stored, {
    userId: owner.userId
  });
  expect(stored).toEqual({
    apiKey: 'sk-or-private',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-sonnet-4',
    provider: 'openrouter'
  });

  const storedCredentials = await owner.client.run((ctx) => readAiSettings(ctx, owner.userId));
  expect(resolveAssistantEnvironment({}, storedCredentials)).toMatchObject({
    AI_MODEL: 'anthropic/claude-sonnet-4',
    AI_PROVIDER: 'openai',
    OPENAI_API_KEY: 'sk-or-private',
    OPENAI_API_MODE: 'chat',
    OPENAI_BASE_URL: 'https://openrouter.ai/api/v1'
  });
  expect(resolveAssistantEnvironment(env, storedCredentials)).toMatchObject({
    OPENAI_API_KEY: 'sk-or-private',
    OPENAI_BASE_URL: 'https://openrouter.ai/api/v1'
  });

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

test('keeps a saved key private to its user and group', async () => {
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

test('keeps a personal key when the user switches organizations', async () => {
  const { owner } = await setupGroup();
  await owner.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: 'sk-personal',
    baseUrl: null,
    model: 'gpt-4.1-mini',
    provider: 'openai'
  });
  const created = await owner.authClient.organization.create({
    name: 'Second Group',
    slug: `second-${crypto.randomUUID()}`
  });
  if (!(created.data && !created.error)) throw new Error('Unable to create second organization');
  const activated = await owner.authClient.organization.setActive({
    organizationId: created.data.id
  });
  if (activated.error) throw new Error('Unable to activate second organization');

  await expect(owner.client.query(api.routes.settings.ai.get.run, {})).resolves.toEqual(
    publicSettings({ configured: true, model: 'gpt-4.1-mini', provider: 'openai' })
  );
});

test('uses a legacy organization-scoped row without exposing its key', async () => {
  const { owner } = await setupGroup();
  if (!owner.organizationId) throw new Error('Expected an organization');
  await owner.client.run(async (ctx) => {
    await ctx.db.insert('aiSettings', {
      apiKey: 'sk-legacy-shared',
      organizationId: owner.organizationId!,
      provider: 'openai'
    });
  });

  await expect(owner.client.query(api.routes.settings.ai.get.run, {})).resolves.toEqual({
    ...publicSettings({ effectiveSource: 'organization' }),
    organization: { baseUrl: null, configured: true, model: null, provider: 'openai' }
  });
});

test('allows managers to configure an organization key and denies members', async () => {
  const { addUser, owner } = await setupGroup();
  if (!owner.organizationId) throw new Error('Expected an organization');
  const member = await addUser('Traveler');
  await owner.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: 'sk-shared',
    baseUrl: null,
    model: null,
    organizationId: owner.organizationId,
    provider: 'openai',
    target: 'organization'
  });
  await expect(member.client.query(api.routes.settings.ai.get.run, {})).resolves.toMatchObject({
    canManageOrganization: false,
    organization: { configured: true, provider: 'openai' },
    personal: { configured: false }
  });
  await member.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: 'sk-member-personal',
    baseUrl: null,
    model: 'claude-sonnet-4-5',
    provider: 'anthropic'
  });
  const effective = await owner.test.query(internal.modules.ai.settings.effective, {
    organizationId: owner.organizationId,
    userId: member.userId
  });
  expect(effective).toMatchObject({
    organization: { apiKey: 'sk-shared', provider: 'openai' },
    personal: { apiKey: 'sk-member-personal', provider: 'anthropic' }
  });
  expect(resolveAssistantEnvironment({}, effective.personal, effective.organization)).toMatchObject(
    {
      AI_MODEL: 'claude-sonnet-4-5',
      AI_PROVIDER: 'anthropic',
      ANTHROPIC_API_KEY: 'sk-member-personal'
    }
  );
  await expect(
    member.client.mutation(api.routes.settings.ai.set.run, {
      apiKey: 'sk-forbidden',
      baseUrl: null,
      model: null,
      organizationId: owner.organizationId,
      provider: 'openai',
      target: 'organization'
    })
  ).rejects.toThrow('Only organization owners and admins can manage group settings');
});

test('rejects an organization write after the active organization changes', async () => {
  const { owner } = await setupGroup();
  if (!owner.organizationId) throw new Error('Expected an organization');
  const initiatingOrganizationId = owner.organizationId;
  const created = await owner.authClient.organization.create({
    name: 'Other Group',
    slug: `other-${crypto.randomUUID()}`
  });
  if (!(created.data && !created.error)) throw new Error('Unable to create another organization');
  const activated = await owner.authClient.organization.setActive({
    organizationId: created.data.id
  });
  if (activated.error) throw new Error('Unable to activate another organization');

  await expect(
    owner.client.mutation(api.routes.settings.ai.set.run, {
      apiKey: 'sk-wrong-group',
      baseUrl: null,
      model: null,
      organizationId: initiatingOrganizationId,
      provider: 'openai',
      target: 'organization'
    })
  ).rejects.toThrow('active organization changed');
});

test('removes personal credentials when their Better Auth user is deleted', async () => {
  const { owner } = await setupGroup();
  await owner.client.mutation(api.routes.settings.ai.set.run, {
    apiKey: 'sk-delete-me',
    baseUrl: null,
    model: null,
    provider: 'openai'
  });

  await owner.test.mutation(internal.modules.ai.settings.removeUserSettings, {
    userId: owner.userId
  });
  await expect(
    owner.test.query(internal.modules.ai.settings.stored, { userId: owner.userId })
  ).resolves.toBeNull();
});

test('updates the model without replacing the stored key', async () => {
  const { owner } = await setupGroup();

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
    owner.test.query(internal.modules.ai.settings.stored, {
      userId: owner.userId
    })
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

  const stored = await owner.test.query(internal.modules.ai.settings.stored, {
    userId: owner.userId
  });
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

  const stored = await owner.test.query(internal.modules.ai.settings.stored, {
    userId: owner.userId
  });
  expect(stored).toEqual({
    apiKey: 'sk-openai',
    provider: 'openai'
  });
});

test('does not keep an official key after switching to a compatible host', async () => {
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
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: null,
      provider: 'compatible'
    })
  ).rejects.toThrow('Paste an API key for the selected provider.');
});
