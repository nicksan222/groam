import { afterEach, expect, test, vi } from 'vite-plus/test';
import { ChatGptAuthorizationError } from '#backend/ai/chatgpt/oauth';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ActionCtx } from '#convex-generated/server';
import { configuredAssistantProvider } from '#convex/modules/ai/provider';
import { setupGroup } from '#testing/trips';
import { chatGptCallback } from './callback';

const protocol = vi.hoisted(() => ({
  create: vi.fn(),
  exchange: vi.fn(),
  fetch: vi.fn(),
  models: vi.fn(),
  provider: vi.fn(),
  revoke: vi.fn()
}));
vi.mock('#backend/ai/chatgpt/oauth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#backend/ai/chatgpt/oauth')>()),
  createAuthorization: protocol.create,
  exchangeAuthorization: protocol.exchange,
  listModels: protocol.models,
  revokeAuthorization: protocol.revoke
}));
vi.mock('#backend/ai/chatgpt/responses-fetch', () => ({ chatGptFetch: protocol.fetch }));
vi.mock('#backend/ai/chatgpt/model', () => ({ configuredChatGptProvider: protocol.provider }));

const storage = internal.modules.ai.chatgpt.storage;
const site = 'http://127.0.0.1:3211';
const redirectUri = `${site}/auth/chatgpt/callback`;
const tokens = {
  accessToken: 'private-access',
  refreshToken: 'private-refresh',
  idToken: 'private-id',
  expiresAt: Date.now() + 3_600_000,
  scopes: 'openid resource.invoke chatgpt.tokens.use.direct'
};
type Owner = Awaited<ReturnType<typeof setupGroup>>['owner'];
const callback = chatGptCallback as typeof chatGptCallback & {
  _handler: (ctx: ActionCtx, request: Request) => Promise<Response>;
};
const invokeCallback = (owner: Owner, query: string) =>
  owner.test.action(async (ctx) => {
    const response = await callback._handler(ctx, new Request(`${redirectUri}?${query}`));
    return response.status;
  });

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

async function connect(owner: Owner, subject = 'chatgpt-user', clientId = 'oaiapp_test') {
  const prepared = await owner.test.mutation(storage.prepare, {
    userId: owner.userId,
    newHostId: 'urn:uuid:routes-test'
  });
  await owner.test.mutation(storage.complete, {
    userId: owner.userId,
    generation: prepared.generation,
    clientId,
    subject,
    email: 'owner@example.com',
    tokens
  });
  const record = await owner.test.query(storage.connection, { userId: owner.userId });
  if (!record) throw new Error('Expected a ChatGPT connection');
  return record._id;
}

async function pendingTransaction(
  owner: Owner,
  state: string,
  connectionId?: Id<'chatgptConnections'>
) {
  const prepared = await owner.test.mutation(storage.prepare, {
    userId: owner.userId,
    newHostId: 'urn:uuid:routes-test',
    ...(connectionId ? { connectionId } : {})
  });
  await owner.test.mutation(storage.saveTransaction, {
    userId: owner.userId,
    generation: prepared.generation,
    state,
    nonce: 'nonce',
    verifier: 'verifier',
    redirectUri,
    expiresAt: Date.now() + 60_000,
    ...(connectionId ? { connectionId } : {})
  });
}

test('connect is refused on hosted deployments without contacting OpenAI', async () => {
  const { owner } = await setupGroup();
  vi.stubEnv('CONVEX_SITE_URL', 'https://groam.example');
  await expect(owner.client.action(api.routes.settings.ai.connect.run, {})).rejects.toThrow(
    'OpenAI-approved access'
  );
  expect(protocol.create).not.toHaveBeenCalled();
});

test('connect starts a new and a reconnect authorization with account hints', async () => {
  const { owner, addUser } = await setupGroup();
  vi.stubEnv('CONVEX_SITE_URL', site);
  protocol.create.mockResolvedValue({
    authorizationUrl: 'https://auth.example/authorize',
    state: 'state-1',
    nonce: 'nonce',
    verifier: 'verifier'
  });
  await expect(owner.client.action(api.routes.settings.ai.connect.run, {})).resolves.toEqual({
    authorizationUrl: 'https://auth.example/authorize'
  });
  expect(protocol.create).toHaveBeenLastCalledWith({
    hostId: expect.stringMatching(/^urn:uuid:/),
    redirectUri
  });

  const connectionId = await connect(owner);
  protocol.create.mockResolvedValue({
    authorizationUrl: 'https://auth.example/reconnect',
    state: 'state-2',
    nonce: 'nonce',
    verifier: 'verifier'
  });
  await owner.client.action(api.routes.settings.ai.connect.run, { connectionId });
  expect(protocol.create).toHaveBeenLastCalledWith(
    expect.objectContaining({
      clientId: 'oaiapp_test',
      idTokenHint: 'private-id',
      loginHint: 'owner@example.com'
    })
  );
  expect(await owner.test.mutation(storage.consumeTransaction, { state: 'state-2' })).toMatchObject(
    { connection: { _id: connectionId } }
  );

  const member = await addUser('Member');
  await expect(
    member.client.action(api.routes.settings.ai.connect.run, { connectionId })
  ).rejects.toThrow('ChatGPT connection not found');
});

test('models lists the live catalog and marks rejected credentials for reconnect', async () => {
  const { owner } = await setupGroup();
  vi.stubEnv('CONVEX_SITE_URL', site);
  const connectionId = await connect(owner);
  protocol.models.mockResolvedValueOnce([{ slug: 'gpt-test', displayName: 'GPT Test' }]);
  await expect(
    owner.client.action(api.routes.settings.ai.models.run, { connectionId })
  ).resolves.toEqual([{ slug: 'gpt-test', displayName: 'GPT Test' }]);

  protocol.models.mockRejectedValueOnce(new Error('offline'));
  await expect(
    owner.client.action(api.routes.settings.ai.models.run, { connectionId })
  ).rejects.toThrow('Unable to load models');
  expect(
    (await owner.client.query(api.routes.settings.ai.get.run, {})).connections[0]
  ).toMatchObject({ connected: true, needsReconnect: false });

  protocol.models.mockRejectedValueOnce(new ChatGptAuthorizationError(true));
  await expect(
    owner.client.action(api.routes.settings.ai.models.run, { connectionId })
  ).rejects.toThrow('Unable to load models');
  expect(
    (await owner.client.query(api.routes.settings.ai.get.run, {})).connections[0]
  ).toMatchObject({ connected: false, needsReconnect: true });
  await expect(
    owner.client.action(api.routes.settings.ai.models.run, { connectionId })
  ).rejects.toThrow('Connect ChatGPT in Settings');
  await expect(
    owner.client.mutation(api.routes.settings.ai.select.run, { connectionId })
  ).rejects.toThrow('Reconnect this ChatGPT account');
});

test('acknowledging the plan notice needs a profile and persists', async () => {
  const { owner } = await setupGroup();
  await expect(owner.client.mutation(api.routes.settings.ai.acknowledge.run, {})).rejects.toThrow(
    'Connect ChatGPT first'
  );
  const connectionId = await connect(owner);
  await owner.client.mutation(api.routes.settings.ai.acknowledge.run, {});
  await owner.client.mutation(api.routes.settings.ai.select.run, {
    connectionId,
    model: 'gpt-test'
  });
  await expect(owner.client.query(api.routes.settings.ai.get.run, {})).resolves.toMatchObject({
    activeConnectionId: connectionId,
    planNoticeAcknowledged: true,
    connections: [{ model: 'gpt-test' }]
  });
});

test('callback stores exchanged credentials for a new connection', async () => {
  const { owner } = await setupGroup();
  vi.stubEnv('CONVEX_SITE_URL', site);
  await pendingTransaction(owner, 'new-state');
  protocol.exchange.mockResolvedValue({
    tokens,
    identity: { subject: 'chatgpt-user', email: 'owner@example.com' }
  });
  expect(await invokeCallback(owner, 'state=new-state&code=code&client_id=oaiapp_new')).toBe(200);
  expect(protocol.exchange).toHaveBeenCalledWith(
    expect.objectContaining({ code: 'code', clientId: 'oaiapp_new', redirectUri })
  );
  await expect(
    owner.test.query(storage.connection, { userId: owner.userId })
  ).resolves.toMatchObject({
    clientId: 'oaiapp_new',
    email: 'owner@example.com',
    subject: 'chatgpt-user'
  });
});

test('callback rejects malformed parameters before exchanging', async () => {
  const { owner } = await setupGroup();
  vi.stubEnv('CONVEX_SITE_URL', site);
  expect(await invokeCallback(owner, 'code=code')).toBe(400);
  expect(await invokeCallback(owner, `state=${'s'.repeat(257)}&code=code`)).toBe(400);
  await pendingTransaction(owner, 'no-code');
  expect(await invokeCallback(owner, 'state=no-code&client_id=oaiapp_test')).toBe(400);
  await pendingTransaction(owner, 'dynamic');
  expect(await invokeCallback(owner, 'state=dynamic&code=c&client_id=dynamic_agent_client')).toBe(
    400
  );
  await pendingTransaction(owner, 'dupe');
  expect(await invokeCallback(owner, 'state=dupe&code=a&code=b&client_id=oaiapp_test')).toBe(400);
  expect(protocol.exchange).not.toHaveBeenCalled();
});

test('callback revokes credentials for a different account or a failed save', async () => {
  const { owner } = await setupGroup();
  vi.stubEnv('CONVEX_SITE_URL', site);
  const connectionId = await connect(owner, 'original-account');
  protocol.revoke.mockResolvedValue(true);

  await pendingTransaction(owner, 'reconnect', connectionId);
  protocol.exchange.mockResolvedValueOnce({
    tokens: { ...tokens, refreshToken: 'other-refresh' },
    identity: { subject: 'other-account' }
  });
  expect(await invokeCallback(owner, 'state=reconnect&code=code')).toBe(400);
  expect(protocol.revoke).toHaveBeenLastCalledWith({
    clientId: 'oaiapp_test',
    refreshToken: 'other-refresh'
  });

  // A fresh attempt for the same client returning a different subject fails to save.
  await pendingTransaction(owner, 'fresh');
  protocol.exchange.mockResolvedValueOnce({
    tokens: { ...tokens, refreshToken: 'unsaved-refresh' },
    identity: { subject: 'third-account' }
  });
  expect(await invokeCallback(owner, 'state=fresh&code=code&client_id=oaiapp_test')).toBe(400);
  expect(protocol.revoke).toHaveBeenLastCalledWith({
    clientId: 'oaiapp_test',
    refreshToken: 'unsaved-refresh'
  });

  await pendingTransaction(owner, 'broken');
  protocol.exchange.mockRejectedValueOnce(new Error('exchange failed'));
  protocol.revoke.mockClear();
  expect(await invokeCallback(owner, 'state=broken&code=code&client_id=oaiapp_test')).toBe(400);
  expect(protocol.revoke).not.toHaveBeenCalled();
  await expect(
    owner.test.query(storage.connection, { userId: owner.userId })
  ).resolves.toMatchObject({
    subject: 'original-account',
    tokens: { refreshToken: 'private-refresh' }
  });
});

test('the assistant provider uses the selected model and reconnects on rejected tokens', async () => {
  const { owner, addUser } = await setupGroup();
  vi.stubEnv('CONVEX_SITE_URL', site);
  const organizationId = owner.organizationId!;
  const connectionId = await connect(owner);
  protocol.models.mockResolvedValue([{ slug: 'gpt-test', displayName: 'GPT Test' }]);
  protocol.provider.mockImplementation((input: unknown) => input);

  const outsider = await addUser('Member');
  await expect(
    owner.test.action(
      async (ctx) =>
        await configuredAssistantProvider(ctx, {
          organizationId: 'other-org',
          userId: outsider.userId
        })
    )
  ).rejects.toThrow('Organization access denied');

  await owner.client.mutation(api.routes.settings.ai.select.run, { connectionId, model: 'gone' });
  await expect(
    owner.test.action(
      async (ctx) =>
        await configuredAssistantProvider(ctx, { organizationId, userId: owner.userId })
    )
  ).rejects.toThrow('Select an available ChatGPT model');

  await owner.client.mutation(api.routes.settings.ai.select.run, {
    connectionId,
    model: 'gpt-test'
  });
  protocol.fetch
    .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    .mockResolvedValueOnce(new Response('denied', { status: 401 }));
  const statuses = await owner.test.action(async (ctx) => {
    const configured = (await configuredAssistantProvider(ctx, {
      organizationId,
      userId: owner.userId
    })) as unknown as { accessToken: string; fetch: typeof fetch; model: string };
    expect(configured).toMatchObject({ accessToken: 'private-access', model: 'gpt-test' });
    const ok = await configured.fetch(
      new Request('https://api.openai.com/v1/responses', { headers: { 'X-Trace': 'a' } }),
      { headers: { 'X-Extra': 'b' } }
    );
    const denied = await configured.fetch('https://api.openai.com/v1/responses');
    return [ok.status, denied.status];
  });
  expect(statuses).toEqual([200, 401]);
  const headers = protocol.fetch.mock.calls[0]?.[1]?.headers as Headers;
  expect(headers.get('Authorization')).toBe('Bearer private-access');
  expect(headers.get('X-Trace')).toBe('a');
  expect(headers.get('X-Extra')).toBe('b');
  expect(
    (await owner.client.query(api.routes.settings.ai.get.run, {})).connections[0]
  ).toMatchObject({ needsReconnect: true });
});
