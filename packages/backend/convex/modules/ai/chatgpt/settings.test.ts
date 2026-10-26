import { expect, test } from 'vite-plus/test';
import { internal } from '#convex-generated/api';
import { setupGroup } from '#testing/trips';
import { chatGptAvailability } from './settings';

test('requires loopback authorization and refuses arbitrary hosted origins', () => {
  expect(chatGptAvailability('http://localhost:3211').redirectUri).toBe(
    'http://127.0.0.1:3211/auth/chatgpt/callback'
  );
  expect(chatGptAvailability('http://127.0.0.1:3211').available).toBe(true);
  for (const site of [
    'https://groam.example',
    'http://127.0.0.1.evil.example:3211',
    'http://user:password@127.0.0.1:3211',
    'invalid',
    ''
  ]) {
    expect(chatGptAvailability(site)).toMatchObject({
      available: false,
      redirectUri: null,
      unavailableReason:
        'This is a demo not yet approved to run AI workflows. Download and self-host to test agents.'
    });
  }
});
test('user deletion clears ChatGPT registrations and pending authorization', async () => {
  const { owner } = await setupGroup();
  const storage = internal.modules.ai.chatgpt.storage;
  const pending = await owner.test.mutation(storage.prepare, {
    userId: owner.userId,
    newHostId: 'urn:uuid:test'
  });
  await owner.test.mutation(storage.saveTransaction, {
    userId: owner.userId,
    generation: pending.generation,
    state: 'pending',
    verifier: 'verifier',
    nonce: 'nonce',
    redirectUri: 'http://127.0.0.1:3211/auth/chatgpt/callback',
    expiresAt: Date.now() + 60_000
  });
  await owner.test.mutation(internal.modules.ai.chatgpt.storage.removeUserConnections, {
    userId: owner.userId
  });
  expect(await owner.test.mutation(storage.consumeTransaction, { state: 'pending' })).toBeNull();
});
