import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import type { ActionCtx } from '#convex-generated/server';
import { configuredAssistantProvider } from '#convex/modules/ai/provider';
import { setupGroup } from '#testing/trips';
import { chatGptCallback } from './callback';

const storage = internal.modules.ai.chatgpt.storage;
const redirectUri = 'http://127.0.0.1:3211/auth/chatgpt/callback';
type Owner = Awaited<ReturnType<typeof setupGroup>>['owner'];
// convex-test.fetch fixes the origin to https://some.convex.site. Use the same
// handler in a real action context for tests requiring the loopback origin.
const callback = chatGptCallback as typeof chatGptCallback & {
  _handler: (ctx: ActionCtx, request: Request) => Promise<Response>;
};
const invokeCallback = (owner: Owner, query: string) =>
  owner.test.action(async (ctx) => {
    const response = await callback._handler(ctx, new Request(`${redirectUri}?${query}`));
    return { status: response.status, cacheControl: response.headers.get('Cache-Control') };
  });

async function prepareTransaction(owner: Owner, state: string, reconnect = false) {
  let connectionId;
  if (reconnect) {
    const initial = await owner.test.mutation(storage.prepare, {
      userId: owner.userId,
      newHostId: 'urn:uuid:callback-test'
    });
    await owner.test.mutation(storage.complete, {
      userId: owner.userId,
      generation: initial.generation,
      clientId: 'oaiapp_original',
      subject: 'original-account',
      tokens: {
        accessToken: 'private-access',
        refreshToken: 'private-refresh',
        idToken: 'private-id',
        expiresAt: Date.now() + 3_600_000,
        scopes: 'openid resource.invoke chatgpt.tokens.use.direct'
      }
    });
    connectionId = (await owner.test.query(storage.connection, { userId: owner.userId }))!._id;
  }
  const prepared = await owner.test.mutation(storage.prepare, {
    userId: owner.userId,
    newHostId: 'urn:uuid:callback-test',
    ...(connectionId ? { connectionId } : {})
  });
  await owner.test.mutation(storage.saveTransaction, {
    userId: owner.userId,
    generation: prepared.generation,
    state,
    nonce: 'private-nonce',
    verifier: 'private-verifier',
    redirectUri,
    expiresAt: Date.now() + 60_000,
    ...(connectionId ? { connectionId } : {})
  });
  return connectionId;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

test('routed callback refuses remote origins and unknown loopback states without network access', async () => {
  const { owner } = await setupGroup();
  vi.stubEnv('CONVEX_SITE_URL', 'http://127.0.0.1:3211');
  const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network'));
  expect((await owner.test.fetch('/auth/chatgpt/callback?state=unknown&code=code')).status).toBe(
    400
  );
  const response = await invokeCallback(owner, 'state=unknown&code=code&client_id=oaiapp_test');
  expect(response.status).toBe(400);
  expect(response.cacheControl).toBe('no-store');
  expect(network).not.toHaveBeenCalled();
});

test('denied callback consumes state and cannot later be replayed with a code', async () => {
  const { owner } = await setupGroup();
  vi.stubEnv('CONVEX_SITE_URL', 'http://127.0.0.1:3211');
  await prepareTransaction(owner, 'denied-state');
  const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network'));
  expect((await invokeCallback(owner, 'state=denied-state&error=access_denied')).status).toBe(400);
  expect(
    (await invokeCallback(owner, 'state=denied-state&code=code&client_id=oaiapp_test')).status
  ).toBe(400);
  expect(
    await owner.test.mutation(storage.consumeTransaction, { state: 'denied-state' })
  ).toBeNull();
  expect(await owner.test.query(storage.connection, { userId: owner.userId })).toBeNull();
  expect(network).not.toHaveBeenCalled();
});

test('reconnect rejects a different returned client before exchanging credentials', async () => {
  const { owner } = await setupGroup();
  vi.stubEnv('CONVEX_SITE_URL', 'http://127.0.0.1:3211');
  await prepareTransaction(owner, 'reconnect-state', true);
  const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network'));
  expect(
    (await invokeCallback(owner, 'state=reconnect-state&code=code&client_id=oaiapp_other')).status
  ).toBe(400);
  expect(
    await owner.test.mutation(storage.consumeTransaction, { state: 'reconnect-state' })
  ).toBeNull();
  expect(await owner.test.query(storage.connection, { userId: owner.userId })).toMatchObject({
    clientId: 'oaiapp_original',
    subject: 'original-account',
    tokens: { accessToken: 'private-access' }
  });
  expect(network).not.toHaveBeenCalled();
});

test('public disconnect cannot revoke another traveler and model selection rejects invalid values', async () => {
  const { owner, addUser } = await setupGroup();
  const member = await addUser('Member');
  const connectionId = (await prepareTransaction(owner, 'pending-state', true))!;
  const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network'));
  await expect(
    member.client.action(api.routes.settings.ai.disconnect.run, { connectionId })
  ).rejects.toThrow('not found');
  for (const model of [' ', 'x'.repeat(201)]) {
    await expect(
      owner.client.mutation(api.routes.settings.ai.select.run, { connectionId, model })
    ).rejects.toThrow('valid ChatGPT model');
  }
  expect(
    (await owner.test.query(storage.connection, { userId: owner.userId }))?.tokens
  ).toBeDefined();
  expect(network).not.toHaveBeenCalled();
});

test('a traveler without a ChatGPT connection cannot start inference', async () => {
  const { owner } = await setupGroup();
  vi.stubEnv('CONVEX_SITE_URL', 'http://127.0.0.1:3211');
  const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network'));
  await expect(
    owner.client.action(
      async (ctx) =>
        await configuredAssistantProvider(ctx, {
          userId: owner.userId,
          organizationId: owner.organizationId!
        })
    )
  ).rejects.toThrow('Connect ChatGPT');
  expect(network).not.toHaveBeenCalled();
});
