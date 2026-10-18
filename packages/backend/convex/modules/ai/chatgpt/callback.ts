import {
  type ChatGptTokens,
  exchangeAuthorization,
  revokeAuthorization
} from '#backend/ai/chatgpt/oauth';
import { internal } from '#convex-generated/api';
import { httpAction } from '#convex-generated/server';
import { chatGptAvailability } from './settings';

function resultPage(success: boolean) {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Groam · ChatGPT</title><body><main><h1>${success ? 'ChatGPT connected' : 'ChatGPT could not connect'}</h1><p>${success ? 'Eligible AI requests in Groam will use your ChatGPT plan. Close this tab and return to Groam.' : 'Return to Groam and start a new connection. If you declined plan usage, allow it when you reconnect.'}</p></main></body></html>`,
    {
      status: success ? 200 : 400,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        'X-Content-Type-Options': 'nosniff'
      }
    }
  );
}
function callbackParameters(url: URL, expectedClientId?: string) {
  const code = url.searchParams.get('code');
  const returnedClientId = url.searchParams.get('client_id');
  const clientId = expectedClientId ?? returnedClientId;
  if (
    !code ||
    code.length > 8192 ||
    !clientId ||
    clientId === 'dynamic_agent_client' ||
    (expectedClientId && returnedClientId && returnedClientId !== expectedClientId) ||
    url.searchParams.getAll('code').length !== 1 ||
    url.searchParams.getAll('client_id').length > 1
  )
    return null;
  return { code, clientId };
}
export const chatGptCallback = httpAction(async (ctx, request) => {
  const availability = chatGptAvailability();
  const url = new URL(request.url);
  if (!availability.redirectUri || url.origin + url.pathname !== availability.redirectUri)
    return resultPage(false);
  const state = url.searchParams.get('state');
  if (!state || state.length > 256 || url.searchParams.getAll('state').length !== 1)
    return resultPage(false);
  // Consume even a denied callback so it cannot later be replayed as success.
  const pending = await ctx.runMutation(internal.modules.ai.chatgpt.storage.consumeTransaction, {
    state
  });
  if (!pending || url.searchParams.has('error')) return resultPage(false);
  const parameters = callbackParameters(url, pending.connection?.clientId);
  if (!parameters) return resultPage(false);
  const { code, clientId } = parameters;
  let issuedTokens: ChatGptTokens | undefined;
  try {
    const { tokens, identity } = await exchangeAuthorization({
      code,
      clientId,
      redirectUri: pending.transaction.redirectUri,
      verifier: pending.transaction.verifier,
      nonce: pending.transaction.nonce
    });
    issuedTokens = tokens;
    if (pending.connection && identity.subject !== pending.connection.subject) {
      await revokeAuthorization({ clientId, refreshToken: tokens.refreshToken });
      return resultPage(false);
    }
    await ctx.runMutation(internal.modules.ai.chatgpt.storage.complete, {
      userId: pending.transaction.userId,
      generation: pending.transaction.generation,
      ...(pending.transaction.connectionId
        ? { connectionId: pending.transaction.connectionId }
        : {}),
      clientId,
      subject: identity.subject,
      ...(identity.email ? { email: identity.email } : {}),
      tokens
    });
    return resultPage(true);
  } catch {
    if (issuedTokens)
      await revokeAuthorization({ clientId, refreshToken: issuedTokens.refreshToken });
    return resultPage(false);
  }
});
