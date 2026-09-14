import {
  type AiKeyCredentials,
  aiKeyProvider,
  hasDeploymentAiCredentials
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
import { env, internalQuery, type MutationCtx, type QueryCtx } from '#convex-generated/server';

async function settingsForOrganization(ctx: MutationCtx | QueryCtx, organizationId: string) {
  return await ctx.db
    .query('aiSettings')
    .withIndex('by_organizationId', (query) => query.eq('organizationId', organizationId))
    .unique();
}

export async function readAiSettings(
  ctx: MutationCtx | QueryCtx,
  organizationId: string
): Promise<AiKeyCredentials | null> {
  const settings = await settingsForOrganization(ctx, organizationId);
  if (!settings) return null;
  return {
    apiKey: settings.apiKey,
    provider: settings.provider,
    ...(settings.baseUrl ? { baseUrl: settings.baseUrl } : {}),
    ...(settings.model ? { model: settings.model } : {})
  };
}

export async function publicAiSettings(ctx: QueryCtx) {
  const workspace = await requireWorkspace(ctx);
  const stored = await readAiSettings(ctx, workspace.organizationId);
  return {
    canManage: isOrganizationManager(workspace.organizationRole),
    configured: stored !== null,
    fromEnvironment: hasDeploymentAiCredentials(env),
    baseUrl: stored?.baseUrl ?? null,
    model: stored?.model ?? null,
    provider: stored?.provider ?? null
  };
}

export async function saveAiSettings(
  ctx: MutationCtx,
  input: {
    apiKey: string | null;
    baseUrl: string | null;
    model: string | null;
    provider: AiKeyCredentials['provider'];
  }
) {
  const workspace = await requireWorkspace(ctx);
  assertOrganizationManager(workspace);
  const preset = aiKeyProvider(input.provider);

  const existing = await settingsForOrganization(ctx, workspace.organizationId);
  if (input.apiKey === null) {
    if (existing) await ctx.db.delete(existing._id);
    return null;
  }

  const nextKey = input.apiKey.trim();
  if (!nextKey && existing && existing.provider !== input.provider) {
    throw new ConvexError('Paste an API key for the selected provider.');
  }

  const apiKey =
    nextKey || existing?.apiKey || (preset.requiresBaseUrl ? preset.keyPlaceholder : undefined);
  if (!apiKey) {
    throw new ConvexError('Paste an API key to save these settings.');
  }

  const model = input.model?.trim() || undefined;
  const baseUrl = preset.requiresBaseUrl
    ? normalizeCompatibleBaseUrl(input.baseUrl ?? undefined, true, isLocalBackend())
    : preset.baseURL;
  const value = {
    apiKey,
    organizationId: workspace.organizationId,
    provider: input.provider,
    ...(baseUrl ? { baseUrl } : {}),
    ...(model ? { model } : {})
  };
  if (existing) await ctx.db.replace('aiSettings', existing._id, value);
  else await ctx.db.insert('aiSettings', value);
  return null;
}

/** Action-side credentials for one group. Never expose this query to the client. */
export const stored = internalQuery({
  args: { organizationId: v.string() },
  returns: v.union(v.null(), aiKeyCredentialsValidator),
  handler: async (ctx, { organizationId }) => await readAiSettings(ctx, organizationId)
});
