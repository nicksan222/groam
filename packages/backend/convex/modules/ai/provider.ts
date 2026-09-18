import {
  hasDeploymentAiCredentials,
  resolveAssistantCredentials
} from '@groam/ai-contracts/providers/keys';
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

export type AssistantCredentialScope = {
  organizationId: string;
  userId: string;
};

/** Resolve deployment credentials first, then personal and organization settings. */
export async function configuredAssistantProvider(
  ctx: ActionCtx,
  agentId: AssistantAgentId,
  scope: AssistantCredentialScope
): Promise<AssistantProviderConfiguration> {
  if (hasDeploymentAiCredentials(env)) return configuredProvider(agentId, env);
  const stored = await ctx.runQuery(internal.modules.ai.settings.effective, {
    organizationId: scope.organizationId,
    userId: scope.userId
  });
  return configuredProvider(
    agentId,
    resolveAssistantCredentials(env, stored?.personal ?? null, stored?.organization ?? null)
      .environment
  );
}

/** Deployment-scoped assistant model provider. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class AssistantProvider {
  static configured = configuredAssistantProvider;
}
