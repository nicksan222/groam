import { ConvexError } from 'convex/values';
import {
  ChatGptAuthorizationError,
  type ChatGptTokens,
  createAuthorization,
  listModels,
  refreshAuthorization,
  revokeAuthorization
} from '#backend/ai/chatgpt/oauth';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ActionCtx } from '#convex-generated/server';
import { chatGptAvailability } from './settings';
import type { UsableChatGptConnection } from './types';

const storage = internal.modules.ai.chatgpt.storage;
export async function beginChatGptConnection(
  ctx: ActionCtx,
  userId: string,
  connectionId?: Id<'chatgptConnections'>
): Promise<{ authorizationUrl: string }> {
  const availability = chatGptAvailability();
  if (!availability.redirectUri)
    throw new ConvexError(availability.unavailableReason ?? 'ChatGPT is unavailable.');
  const prepared = await ctx.runMutation(storage.prepare, {
    userId,
    ...(connectionId ? { connectionId } : {}),
    newHostId: `urn:uuid:${crypto.randomUUID()}`
  });
  const pending = await createAuthorization({
    hostId: prepared.hostId,
    redirectUri: availability.redirectUri,
    ...(prepared.connection
      ? {
          clientId: prepared.connection.clientId,
          ...(prepared.connection.tokens?.idToken
            ? { idTokenHint: prepared.connection.tokens.idToken }
            : {}),
          ...(prepared.connection.email ? { loginHint: prepared.connection.email } : {})
        }
      : {})
  });
  await ctx.runMutation(storage.saveTransaction, {
    userId,
    state: pending.state,
    nonce: pending.nonce,
    verifier: pending.verifier,
    redirectUri: availability.redirectUri,
    expiresAt: Date.now() + 10 * 60_000,
    generation: prepared.generation,
    ...(connectionId ? { connectionId } : {})
  });
  return { authorizationUrl: pending.authorizationUrl };
}

/** A database lease serializes rotating refresh tokens across action isolates. */
export async function usableChatGptConnection(
  ctx: ActionCtx,
  userId: string,
  connectionId?: Id<'chatgptConnections'>
): Promise<UsableChatGptConnection> {
  if (!chatGptAvailability().available)
    throw new ConvexError('ChatGPT plan usage is unavailable on this hosted deployment.');
  for (let attempt = 0; attempt < 25; attempt++) {
    const record = await ctx.runQuery(storage.connection, {
      userId,
      ...(connectionId ? { connectionId } : {})
    });
    if (!record?.tokens || record.needsReconnect)
      throw new ConvexError('Connect ChatGPT in Settings → AI to use your ChatGPT plan.');
    if (record.tokens.expiresAt > Date.now() + 60_000) return { ...record, tokens: record.tokens };
    const refreshed = await refreshChatGptConnection(ctx, userId, {
      ...record,
      tokens: record.tokens
    });
    if (!refreshed) await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new ConvexError('ChatGPT is renewing this connection. Try again shortly.');
}
async function refreshChatGptConnection(
  ctx: ActionCtx,
  userId: string,
  record: UsableChatGptConnection
): Promise<boolean> {
  const lease = {
    userId,
    connectionId: record._id,
    revision: record.revision,
    leaseId: crypto.randomUUID()
  };
  if (!(await ctx.runMutation(storage.acquireRefresh, lease))) return false;
  let tokens: ChatGptTokens;
  try {
    tokens = await refreshAuthorization({
      clientId: record.clientId,
      refreshToken: record.tokens.refreshToken,
      idToken: record.tokens.idToken,
      scopes: record.tokens.scopes
    });
  } catch (error) {
    await ctx.runMutation(storage.finishRefresh, {
      ...lease,
      reconnect: error instanceof ChatGptAuthorizationError && error.reconnect
    });
    throw new ConvexError(
      error instanceof ChatGptAuthorizationError
        ? error.message
        : 'Unable to refresh ChatGPT. Try again.'
    );
  }
  if (!(await ctx.runMutation(storage.finishRefresh, { ...lease, tokens, reconnect: false }))) {
    await revokeAuthorization({ clientId: record.clientId, refreshToken: tokens.refreshToken });
    throw new ConvexError('The ChatGPT connection changed. Try again.');
  }
  return true;
}
export async function chatGptModels(
  ctx: ActionCtx,
  userId: string,
  connectionId: Id<'chatgptConnections'>
): Promise<Array<{ slug: string; displayName: string }>> {
  const connection = await usableChatGptConnection(ctx, userId, connectionId);
  return await modelsForChatGptConnection(ctx, userId, connection);
}
export async function modelsForChatGptConnection(
  ctx: ActionCtx,
  userId: string,
  connection: UsableChatGptConnection
): Promise<Array<{ slug: string; displayName: string }>> {
  try {
    return await listModels(connection.tokens.accessToken);
  } catch (error) {
    if (error instanceof ChatGptAuthorizationError && error.reconnect) {
      await ctx.runMutation(storage.markReconnect, {
        userId,
        connectionId: connection._id,
        revision: connection.revision
      });
    }
    throw new ConvexError(
      'Unable to load models from ChatGPT. Reconnect if the problem continues.'
    );
  }
}
export async function disconnectChatGptConnection(
  ctx: ActionCtx,
  userId: string,
  connectionId: Id<'chatgptConnections'>
): Promise<{ revoked: boolean }> {
  // Stop local use atomically before contacting the external service.
  const previous = await ctx.runMutation(storage.disconnect, { userId, connectionId });
  const revoked = previous.tokens
    ? await revokeAuthorization({
        clientId: previous.clientId,
        refreshToken: previous.tokens.refreshToken
      })
    : true;
  return { revoked: revoked && !previous.leaseId };
}
