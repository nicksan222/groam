import { afterEach, expect, test, vi } from 'vite-plus/test';
import { ChatGptAuthorizationError } from '#backend/ai/chatgpt/oauth';
import type { ActionCtx } from '#convex-generated/server';
import { usableChatGptConnection } from './actions';

const protocol = vi.hoisted(() => ({ refresh: vi.fn(), revoke: vi.fn() }));
vi.mock('#backend/ai/chatgpt/oauth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#backend/ai/chatgpt/oauth')>()),
  refreshAuthorization: protocol.refresh,
  revokeAuthorization: protocol.revoke
}));
afterEach(() => vi.clearAllMocks());
const tokens = {
  accessToken: 'access',
  refreshToken: 'rotated',
  idToken: 'id',
  scopes: 'resource.invoke chatgpt.tokens.use.direct',
  expiresAt: Date.now() + 3_600_000
};
function context() {
  const runMutation = vi.fn().mockResolvedValueOnce(true);
  const runQuery = vi.fn().mockResolvedValue({
    _id: 'connection',
    clientId: 'oaiapp_test',
    revision: 1,
    tokens: { ...tokens, expiresAt: 0 }
  });
  return { runMutation, ctx: { runMutation, runQuery } as unknown as ActionCtx };
}

test('a rejected refreshed-token write revokes the discarded rotation and preserves the connection-changed error', async () => {
  const { ctx, runMutation } = context();
  runMutation.mockResolvedValueOnce(false);
  protocol.refresh.mockResolvedValue(tokens);
  protocol.revoke.mockResolvedValue(true);
  await expect(usableChatGptConnection(ctx, 'owner')).rejects.toThrow(
    'The ChatGPT connection changed. Try again.'
  );
  expect(protocol.revoke).toHaveBeenCalledWith({
    clientId: 'oaiapp_test',
    refreshToken: 'rotated'
  });
  expect(runMutation).toHaveBeenCalledTimes(2);
});
test('persistence failures are not caught as OAuth refresh failures', async () => {
  const { ctx, runMutation } = context();
  runMutation.mockRejectedValueOnce(new Error('Persistence unavailable'));
  protocol.refresh.mockResolvedValue(tokens);
  await expect(usableChatGptConnection(ctx, 'owner')).rejects.toThrow('Persistence unavailable');
  expect(runMutation).toHaveBeenCalledTimes(2);
});
test.each([false, true])(
  'OAuth refresh failures release the lease with reconnect=%s',
  async (reconnect) => {
    const { ctx, runMutation } = context();
    runMutation.mockResolvedValueOnce(true);
    protocol.refresh.mockRejectedValue(new ChatGptAuthorizationError(reconnect));
    await expect(usableChatGptConnection(ctx, 'owner')).rejects.toThrow(
      'ChatGPT authorization failed'
    );
    expect(runMutation.mock.calls[1]?.[1]).toMatchObject({ reconnect });
    expect(protocol.revoke).not.toHaveBeenCalled();
  }
);

test('hosted agent requests explain the demo restriction before accessing a connection', async () => {
  vi.stubEnv('CONVEX_SITE_URL', 'https://groam.example');
  try {
    const { ctx, runMutation } = context();
    await expect(usableChatGptConnection(ctx, 'owner')).rejects.toThrow(
      'This is a demo not yet approved to run AI workflows. Download and self-host to test agents.'
    );
    expect(ctx.runQuery).not.toHaveBeenCalled();
    expect(runMutation).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllEnvs();
  }
});
