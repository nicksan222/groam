import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { createTest } from '#testing/factory';
import { setupGroup } from '#testing/trips';

const tokens = {
  accessToken: 'private-access',
  refreshToken: 'private-refresh',
  idToken: 'private-id',
  expiresAt: Date.now() + 3_600_000,
  scopes: 'openid resource.invoke chatgpt.tokens.use.direct'
};
const storage = internal.modules.ai.chatgpt.storage;

test('ChatGPT metadata stays private to each Groam user', async () => {
  const { owner, addUser } = await setupGroup();
  const member = await addUser('Member');
  const prep = await owner.test.mutation(storage.prepare, {
    userId: owner.userId,
    newHostId: 'urn:uuid:test'
  });
  await owner.test.mutation(storage.complete, {
    userId: owner.userId,
    generation: prep.generation,
    clientId: 'oaiapp_test',
    subject: 'chatgpt-user',
    email: 'owner@example.com',
    tokens
  });
  const settings = await owner.client.query(api.routes.settings.ai.get.run, {});
  expect(settings.connections).toHaveLength(1);
  expect(settings.connections[0]).toMatchObject({ email: 'owner@example.com', connected: true });
  expect(JSON.stringify(settings)).not.toContain('private-');
  expect((await member.client.query(api.routes.settings.ai.get.run, {})).connections).toEqual([]);
  await expect(
    member.client.mutation(api.routes.settings.ai.select.run, {
      connectionId: settings.connections[0]!.id
    })
  ).rejects.toThrow('not found');
  await expect(createTest().query(api.routes.settings.ai.get.run, {})).rejects.toThrow(
    'Not authenticated'
  );
});

test('OAuth transactions are one-time and expiration fails closed', async () => {
  const { owner } = await setupGroup();
  const prep = await owner.test.mutation(storage.prepare, {
    userId: owner.userId,
    newHostId: 'urn:uuid:test'
  });
  const transaction = {
    userId: owner.userId,
    generation: prep.generation,
    state: 'random-state',
    nonce: 'nonce',
    verifier: 'verifier',
    redirectUri: 'http://127.0.0.1:3211/auth/chatgpt/callback',
    expiresAt: Date.now() + 60_000
  };
  await owner.test.mutation(storage.saveTransaction, transaction);
  expect(
    await owner.test.mutation(storage.consumeTransaction, { state: transaction.state })
  ).not.toBeNull();
  expect(
    await owner.test.mutation(storage.consumeTransaction, { state: transaction.state })
  ).toBeNull();
  await owner.test.mutation(storage.saveTransaction, {
    ...transaction,
    state: 'expired',
    expiresAt: Date.now() - 1
  });
  expect(await owner.test.mutation(storage.consumeTransaction, { state: 'expired' })).toBeNull();
});

test('disconnect invalidates pending authorization and rotating-token refresh', async () => {
  const { owner } = await setupGroup();
  const prep = await owner.test.mutation(storage.prepare, {
    userId: owner.userId,
    newHostId: 'urn:uuid:test'
  });
  await owner.test.mutation(storage.complete, {
    userId: owner.userId,
    generation: prep.generation,
    clientId: 'oaiapp_test',
    subject: 'chatgpt-user',
    tokens
  });
  const record = await owner.test.query(storage.connection, { userId: owner.userId });
  const input = {
    userId: owner.userId,
    connectionId: record!._id,
    revision: record!.revision,
    leaseId: 'lease-one'
  };
  expect(await owner.test.mutation(storage.acquireRefresh, input)).toBe(true);
  expect(
    await owner.test.mutation(storage.acquireRefresh, { ...input, leaseId: 'lease-two' })
  ).toBe(false);
  const pending = await owner.test.mutation(storage.prepare, {
    userId: owner.userId,
    newHostId: 'urn:uuid:ignored'
  });
  await owner.test.mutation(storage.disconnect, {
    userId: owner.userId,
    connectionId: record!._id
  });
  expect(
    await owner.test.mutation(storage.finishRefresh, { ...input, tokens, reconnect: false })
  ).toBe(false);
  expect(
    (await owner.test.query(storage.connection, { userId: owner.userId }))?.tokens
  ).toBeUndefined();
  await expect(
    owner.test.mutation(storage.complete, {
      userId: owner.userId,
      generation: pending.generation,
      clientId: 'oaiapp_test',
      subject: 'chatgpt-user',
      tokens
    })
  ).rejects.toThrow('canceled');
});

test('reconnect invalidation is atomic and refuses stale revisions, disconnected accounts, and active refreshes', async () => {
  const { owner } = await setupGroup();
  const prep = await owner.test.mutation(storage.prepare, {
    userId: owner.userId,
    newHostId: 'urn:uuid:test'
  });
  await owner.test.mutation(storage.complete, {
    userId: owner.userId,
    generation: prep.generation,
    clientId: 'oaiapp_test',
    subject: 'chatgpt-user',
    tokens
  });
  const record = (await owner.test.query(storage.connection, { userId: owner.userId }))!;
  const input = { userId: owner.userId, connectionId: record._id, revision: record.revision };
  expect(
    await owner.test.mutation(storage.markReconnect, { ...input, revision: record.revision - 1 })
  ).toBe(false);
  expect((await owner.test.query(storage.connection, { userId: owner.userId }))?.tokens).toEqual(
    tokens
  );
  const lease = { ...input, leaseId: 'active-refresh' };
  expect(await owner.test.mutation(storage.acquireRefresh, lease)).toBe(true);
  expect(await owner.test.mutation(storage.markReconnect, input)).toBe(false);
  const rotated = { ...tokens, accessToken: 'rotated-access', refreshToken: 'rotated-refresh' };
  expect(
    await owner.test.mutation(storage.finishRefresh, {
      ...lease,
      tokens: rotated,
      reconnect: false
    })
  ).toBe(true);
  expect(await owner.test.mutation(storage.markReconnect, input)).toBe(false);
  expect((await owner.test.query(storage.connection, { userId: owner.userId }))?.tokens).toEqual(
    rotated
  );
  const current = { ...input, revision: record.revision + 1 };
  expect(await owner.test.mutation(storage.markReconnect, current)).toBe(true);
  const invalidated = (await owner.test.query(storage.connection, { userId: owner.userId }))!;
  expect(invalidated).toMatchObject({ needsReconnect: true, revision: record.revision + 2 });
  expect(invalidated.tokens).toBeUndefined();
  expect(invalidated.leaseId).toBeUndefined();
  expect(
    await owner.test.mutation(storage.markReconnect, { ...input, revision: invalidated.revision })
  ).toBe(false);
  await owner.test.mutation(storage.disconnect, { userId: owner.userId, connectionId: record._id });
  expect(
    await owner.test.mutation(storage.markReconnect, {
      ...input,
      revision: invalidated.revision + 1
    })
  ).toBe(false);
  expect(
    (await owner.test.query(storage.connection, { userId: owner.userId }))?.needsReconnect
  ).toBe(false);
});
