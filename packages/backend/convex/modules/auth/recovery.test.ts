import { expect, test } from 'vitest';
import { components } from '#convex-generated/api';
import { createTestAuthClient } from '#testing/auth/client';
import { createAuthenticatedTest } from '#testing/factory';
import { accountRecovery } from './recovery';

const currentPassword = 'Test-password-1234';
const recoveredPassword = 'Recovered-password-1234';

async function replaceRecoveryManifest(
  convex: Awaited<ReturnType<typeof createAuthenticatedTest>>['test'],
  userId: string,
  value: string
) {
  const identifier = `account-recovery-generation:${userId}`;
  await convex.mutation(components.betterAuth.adapter.deleteMany, {
    input: {
      model: 'verification',
      where: [{ field: 'identifier', value: identifier }]
    },
    paginationOpts: { cursor: null, numItems: 10 }
  });
  const now = Date.now();
  await convex.mutation(components.betterAuth.adapter.create, {
    input: {
      data: {
        createdAt: now,
        expiresAt: now + 60_000,
        identifier,
        updatedAt: now,
        value
      },
      model: 'verification'
    }
  });
}

test('uses Better Auth rate limiting for every recovery endpoint', () => {
  const [rule] = accountRecovery().rateLimit;

  expect(rule?.max).toBe(5);
  expect(rule?.window).toBe(60);
  expect(rule?.pathMatcher('/account-recovery/reset-password')).toBe(true);
  expect(rule?.pathMatcher('/sign-in/username')).toBe(false);
});

test('requires an authenticated user and their current password to generate codes', async () => {
  const { authClient, test: convex } = await createAuthenticatedTest();
  const anonymous = createTestAuthClient(convex).client;

  const unauthenticated = await anonymous.accountRecovery.generate({ password: currentPassword });
  expect(unauthenticated.error).not.toBeNull();

  const wrongPassword = await authClient.accountRecovery.generate({ password: 'not-the-password' });
  expect(wrongPassword.error).not.toBeNull();

  const generated = await authClient.accountRecovery.generate({ password: currentPassword });
  expect(generated.error).toBeNull();
  expect(generated.data?.codes).toHaveLength(8);
  expect(generated.data?.codes[0]).toMatch(/^[A-Z0-9]{4}(?:-[A-Z0-9]{4}){4}$/u);
});

test('resets the password once, revokes sessions, and invalidates the whole set', async () => {
  const { authClient, test: convex } = await createAuthenticatedTest();
  const updated = await authClient.updateUser({ username: 'recoverable_user' });
  expect(updated.error).toBeNull();

  const firstGeneration = await authClient.accountRecovery.generate({ password: currentPassword });
  const [supersededCode] = firstGeneration.data?.codes ?? [];
  const secondGeneration = await authClient.accountRecovery.generate({ password: currentPassword });
  const [firstCode, secondCode] = secondGeneration.data?.codes ?? [];
  const anonymous = createTestAuthClient(convex).client;

  const superseded = await anonymous.accountRecovery.resetPassword({
    code: supersededCode ?? '',
    newPassword: recoveredPassword,
    username: 'recoverable_user'
  });
  expect(superseded.error).not.toBeNull();

  const invalidCode = await anonymous.accountRecovery.resetPassword({
    code: 'AAAA-BBBB-CCCC-DDDD-EEEE',
    newPassword: recoveredPassword,
    username: 'recoverable_user'
  });
  expect(invalidCode.error).not.toBeNull();

  const wrongUsername = await anonymous.accountRecovery.resetPassword({
    code: firstCode ?? '',
    newPassword: recoveredPassword,
    username: 'different_user'
  });
  expect(wrongUsername.error).not.toBeNull();

  const recovered = await anonymous.accountRecovery.resetPassword({
    code: (firstCode ?? '').replaceAll('-', '').toLowerCase(),
    newPassword: recoveredPassword,
    username: 'RECOVERABLE_USER'
  });
  expect(recovered.error).toBeNull();

  const revokedSession = await authClient.accountRecovery.generate({ password: recoveredPassword });
  expect(revokedSession.error).not.toBeNull();

  const replayedSet = await createTestAuthClient(convex).client.accountRecovery.resetPassword({
    code: secondCode ?? '',
    newPassword: 'Another-password-1234',
    username: 'recoverable_user'
  });
  expect(replayedSet.error).not.toBeNull();

  const signedIn = await anonymous.signIn.username({
    password: recoveredPassword,
    username: 'recoverable_user'
  });
  expect(signedIn.error).toBeNull();
});

test('rejects password policy failures without consuming the recovery code', async () => {
  const { authClient, test: convex } = await createAuthenticatedTest();
  await authClient.updateUser({ username: 'password_policy_user' });
  const generated = await authClient.accountRecovery.generate({ password: currentPassword });
  const [code] = generated.data?.codes ?? [];
  const anonymous = createTestAuthClient(convex).client;

  const tooShort = await anonymous.accountRecovery.resetPassword({
    code: code ?? '',
    newPassword: 'short',
    username: 'password_policy_user'
  });
  expect(tooShort.error).not.toBeNull();

  const tooLong = await anonymous.accountRecovery.resetPassword({
    code: code ?? '',
    newPassword: 'x'.repeat(129),
    username: 'password_policy_user'
  });
  expect(tooLong.error).not.toBeNull();

  const valid = await anonymous.accountRecovery.resetPassword({
    code: code ?? '',
    newPassword: recoveredPassword,
    username: 'password_policy_user'
  });
  expect(valid.error).toBeNull();
});

test('allows only one simultaneous reset from the same recovery set', async () => {
  const { authClient, test: convex } = await createAuthenticatedTest();
  await authClient.updateUser({ username: 'concurrent_recovery_user' });
  const generated = await authClient.accountRecovery.generate({ password: currentPassword });
  const [firstCode, secondCode] = generated.data?.codes ?? [];
  const firstClient = createTestAuthClient(convex).client;
  const secondClient = createTestAuthClient(convex).client;
  const passwords = ['Concurrent-password-1', 'Concurrent-password-2'] as const;

  const results = await Promise.all([
    firstClient.accountRecovery.resetPassword({
      code: firstCode ?? '',
      newPassword: passwords[0],
      username: 'concurrent_recovery_user'
    }),
    secondClient.accountRecovery.resetPassword({
      code: secondCode ?? '',
      newPassword: passwords[1],
      username: 'concurrent_recovery_user'
    })
  ]);

  expect(results.filter((result) => result.error === null)).toHaveLength(1);
  const signIns = await Promise.all(
    passwords.map((password) =>
      createTestAuthClient(convex).client.signIn.username({
        password,
        username: 'concurrent_recovery_user'
      })
    )
  );
  expect(signIns.filter((result) => result.error === null)).toHaveLength(1);
});

test('fails closed on malformed manifests and replaces structurally invalid manifests', async () => {
  const { authClient, test: convex, userId } = await createAuthenticatedTest();
  await authClient.updateUser({ username: 'manifest_user' });
  const firstGeneration = await authClient.accountRecovery.generate({ password: currentPassword });
  const [firstCode] = firstGeneration.data?.codes ?? [];
  const anonymous = createTestAuthClient(convex).client;

  await replaceRecoveryManifest(convex, userId, 'not-json');
  const malformed = await anonymous.accountRecovery.resetPassword({
    code: firstCode ?? '',
    newPassword: recoveredPassword,
    username: 'manifest_user'
  });
  expect(malformed.error).not.toBeNull();

  await replaceRecoveryManifest(convex, userId, JSON.stringify({ generation: 42 }));
  const regenerated = await authClient.accountRecovery.generate({ password: currentPassword });
  expect(regenerated.error).toBeNull();
  const [validCode] = regenerated.data?.codes ?? [];
  const recovered = await anonymous.accountRecovery.resetPassword({
    code: validCode ?? '',
    newPassword: recoveredPassword,
    username: 'manifest_user'
  });
  expect(recovered.error).toBeNull();
});
