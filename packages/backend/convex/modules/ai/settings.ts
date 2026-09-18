import {
  type AiKeyCredentials,
  aiKeyProvider,
  hasDeploymentAiCredentials,
  resolveAssistantCredentials
} from '@groam/ai-contracts/providers/keys';
import { ConvexError, v } from 'convex/values';
import { normalizeCompatibleBaseUrl } from '#convex/modules/ai/hosts';
import { aiKeyCredentialsValidator } from '#convex/modules/ai/validators';
import {
  assertOrganizationManager,
  isOrganizationManager,
  requireWorkspace
} from '#convex/modules/auth/workspace';
import { isLocalBackend } from '#convex/modules/dev/local';
import {
  env,
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx
} from '#convex-generated/server';

export type AiSettingsTarget = 'organization' | 'personal';

async function personalSettings(ctx: MutationCtx | QueryCtx, userId: string) {
  return await ctx.db
    .query('aiSettings')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .unique();
}

async function organizationSettings(ctx: MutationCtx | QueryCtx, organizationId: string) {
  return await ctx.db
    .query('aiSettings')
    .withIndex('by_organizationId_and_userId', (q) =>
      q.eq('organizationId', organizationId).eq('userId', undefined)
    )
    .unique();
}

function credentials(
  settings: Awaited<ReturnType<typeof personalSettings>>
): AiKeyCredentials | null {
  if (!settings) return null;
  return {
    apiKey: settings.apiKey,
    provider: settings.provider,
    ...(settings.baseUrl ? { baseUrl: settings.baseUrl } : {}),
    ...(settings.model ? { model: settings.model } : {})
  };
}

export async function readAiSettings(ctx: MutationCtx | QueryCtx, userId: string) {
  return credentials(await personalSettings(ctx, userId));
}

function publicStored(settings: Awaited<ReturnType<typeof personalSettings>>) {
  return {
    baseUrl: settings?.baseUrl ?? null,
    configured: settings !== null,
    model: settings?.model ?? null,
    provider: settings?.provider ?? null
  };
}

export async function publicAiSettings(ctx: QueryCtx) {
  const workspace = await requireWorkspace(ctx);
  const environmentConfigured = hasDeploymentAiCredentials(env);
  const [personal, organization] = environmentConfigured
    ? [null, null]
    : await Promise.all([
        personalSettings(ctx, workspace.userId),
        organizationSettings(ctx, workspace.organizationId)
      ]);
  return {
    canManageOrganization: isOrganizationManager(workspace.organizationRole),
    effectiveSource: resolveAssistantCredentials(
      env,
      credentials(personal),
      credentials(organization)
    ).source,
    environmentConfigured,
    organizationId: workspace.organizationId,
    organization: publicStored(organization),
    personal: publicStored(personal)
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: validates and upserts both credential targets
export async function saveAiSettings(
  ctx: MutationCtx,
  input: {
    apiKey: string | null;
    baseUrl: string | null;
    model: string | null;
    organizationId?: string | null;
    provider: AiKeyCredentials['provider'];
    target?: AiSettingsTarget;
  }
) {
  const workspace = await requireWorkspace(ctx);
  if (hasDeploymentAiCredentials(env)) throw new ConvexError('AI is managed by this deployment.');
  const target = input.target ?? 'personal';
  if (target === 'organization') {
    assertOrganizationManager(workspace);
    if (!input.organizationId || input.organizationId !== workspace.organizationId) {
      throw new ConvexError('The active organization changed. Start the connection again.');
    }
  }
  const existing =
    target === 'personal'
      ? await personalSettings(ctx, workspace.userId)
      : await organizationSettings(ctx, workspace.organizationId);
  if (input.apiKey === null) {
    if (existing) await ctx.db.delete(existing._id);
    return null;
  }
  const preset = aiKeyProvider(input.provider);
  const nextKey = input.apiKey.trim();
  if (!nextKey && existing && existing.provider !== input.provider)
    throw new ConvexError('Paste an API key for the selected provider.');
  const apiKey =
    nextKey || existing?.apiKey || (preset.requiresBaseUrl ? preset.keyPlaceholder : undefined);
  if (!apiKey) throw new ConvexError('Paste an API key to save these settings.');
  const model = input.model?.trim() || undefined;
  const baseUrl = preset.requiresBaseUrl
    ? normalizeCompatibleBaseUrl(input.baseUrl ?? undefined, true, isLocalBackend())
    : preset.baseURL;
  const value = {
    apiKey,
    organizationId: workspace.organizationId,
    provider: input.provider,
    ...(target === 'personal' ? { userId: workspace.userId } : {}),
    ...(baseUrl ? { baseUrl } : {}),
    ...(model ? { model } : {})
  };
  if (existing) await ctx.db.replace('aiSettings', existing._id, value);
  else await ctx.db.insert('aiSettings', value);
  return null;
}

export const effective = internalQuery({
  args: { organizationId: v.string(), userId: v.string() },
  returns: v.object({
    organization: v.union(v.null(), aiKeyCredentialsValidator),
    personal: v.union(v.null(), aiKeyCredentialsValidator)
  }),
  handler: async (ctx, { organizationId, userId }) => ({
    organization: credentials(await organizationSettings(ctx, organizationId)),
    personal: credentials(await personalSettings(ctx, userId))
  })
});

export const stored = internalQuery({
  args: { userId: v.string() },
  returns: v.union(v.null(), aiKeyCredentialsValidator),
  handler: async (ctx, { userId }) => await readAiSettings(ctx, userId)
});
export const removeUserSettings = internalMutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const settings = await personalSettings(ctx, userId);
    if (settings) await ctx.db.delete(settings._id);
    return null;
  }
});
export const removeOrganizationSettings = internalMutation({
  args: { organizationId: v.string() },
  returns: v.null(),
  handler: async (ctx, { organizationId }) => {
    const settings = await organizationSettings(ctx, organizationId);
    if (settings) await ctx.db.delete(settings._id);
    return null;
  }
});
