import { ConvexError } from 'convex/values';
import {
  type AssistantProviderConfiguration,
  configuredChatGptProvider
} from '#backend/ai/chatgpt/model';
import { chatGptFetch } from '#backend/ai/chatgpt/responses-fetch';
import { internal } from '#convex-generated/api';
import type { ActionCtx } from '#convex-generated/server';
import { hasOrganizationMembership } from '#convex/modules/auth/workspace';
import { usableChatGptConnection, modelsForChatGptConnection } from './chatgpt/actions';

export type AssistantCredentialScope = { organizationId: string; userId: string };

/** Resolve the initiating user's personal ChatGPT plan. */
export async function configuredAssistantProvider(
  ctx: ActionCtx,
  scope: AssistantCredentialScope,
  options?: { research: { searchContextSize: 'low' | 'medium' | 'high' } }
): Promise<AssistantProviderConfiguration> {
  if (!(await hasOrganizationMembership(ctx, scope.organizationId, scope.userId)))
    throw new ConvexError('Organization access denied');
  const connection = await usableChatGptConnection(ctx, scope.userId);
  const models = await modelsForChatGptConnection(ctx, scope.userId, connection);
  const model = connection.model ?? models[0]?.slug;
  if (!model || !models.some((item) => item.slug === model))
    throw new ConvexError('Select an available ChatGPT model in Settings → AI.');
  return configuredChatGptProvider({
    accessToken: connection.tokens.accessToken,
    model,
    ...(options?.research ? { searchContextSize: options.research.searchContextSize } : {}),
    fetch: async (input, init) => {
      // Recheck on each tool step: disconnects and refreshed tokens take effect immediately.
      const current = await usableChatGptConnection(ctx, scope.userId, connection._id);
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
      headers.set('Authorization', `Bearer ${current.tokens.accessToken}`);
      const response = await chatGptFetch(input, { ...init, headers });
      if (response.status === 401 || response.status === 403) {
        await ctx.runMutation(internal.modules.ai.chatgpt.storage.markReconnect, {
          userId: scope.userId,
          connectionId: current._id,
          revision: current.revision
        });
      }
      return response;
    }
  });
}
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this facade
export class AssistantProvider {
  static configured = configuredAssistantProvider;
}
