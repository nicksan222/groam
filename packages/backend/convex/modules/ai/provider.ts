import { resolveAssistantEnvironment } from '@groam/ai-contracts/providers/keys';
import {
  type AssistantAgentId,
  type AssistantProviderConfiguration,
  configuredAssistantProvider as configuredProvider
} from '#backend/ai/providers/index';
import { internal } from '#convex-generated/api';
import { type ActionCtx, env } from '#convex-generated/server';

export type {
  AssistantProviderConfiguration,
  AssistantProviderEnvironment,
  AssistantProviderId
} from '#backend/ai/providers/index';

/** Resolve the assistant model from Convex env, falling back to a Settings-saved key. */
export async function configuredAssistantProvider(
  ctx: ActionCtx,
  agentId: AssistantAgentId,
  organizationId: string
): Promise<AssistantProviderConfiguration> {
  const stored = await ctx.runQuery(internal.modules.ai.settings.stored, { organizationId });
  return configuredProvider(agentId, resolveAssistantEnvironment(env, stored));
}

/** Deployment-scoped assistant model provider. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class AssistantProvider {
  static configured = configuredAssistantProvider;
}
