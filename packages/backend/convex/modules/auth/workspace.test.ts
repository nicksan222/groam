import { expect, onTestFinished, test, vi } from 'vite-plus/test';
import { api, components } from '#convex-generated/api';
import {
  isOrganizationManager,
  requireWorkspace,
  workspaceRoster
} from '#convex/modules/auth/workspace';
import { createAuthenticatedTest, createTest } from '#testing/factory';
import { setupGroup } from '#testing/trips';

test('distinguishes missing Better Auth sessions from missing active organizations', async () => {
  const withoutSession = createTest().withIdentity({
    email: 'missing@example.com',
    issuer: 'http://127.0.0.1:3211/api/auth/convex',
    sessionId: 'missing-session',
    subject: 'missing-user',
    tokenIdentifier: 'missing-session|missing-user'
  });
  await expect(
    withoutSession
      .query(api.routes.media.page.run, { paginationOpts: { cursor: null, numItems: 1 } })
      .then((result) => result.page)
  ).rejects.toThrow('Not authenticated');

  const withoutOrganization = await createAuthenticatedTest();
  await expect(
    withoutOrganization.client
      .query(api.routes.media.page.run, { paginationOpts: { cursor: null, numItems: 1 } })
      .then((result) => result.page)
  ).rejects.toThrow('No active organization');
});

test('denies callers who are no longer members of the active organization', async () => {
  const revoked = await createAuthenticatedTest({
    organization: { membership: 'revoked', name: 'Former Group' }
  });
  await expect(
    revoked.client
      .query(api.routes.media.page.run, { paginationOpts: { cursor: null, numItems: 1 } })
      .then((result) => result.page)
  ).rejects.toThrow(/Organization access denied|No active organization/u);
});

test('denies sessions that were signed out or have expired', async () => {
  const signedOut = await createAuthenticatedTest({ organization: { name: 'Signed Out Group' } });
  await signedOut.authClient.signOut();
  await expect(
    signedOut.client
      .query(api.routes.media.page.run, { paginationOpts: { cursor: null, numItems: 1 } })
      .then((result) => result.page)
  ).rejects.toThrow('Not authenticated');

  const expired = await createAuthenticatedTest({ organization: { name: 'Expired Group' } });
  await expect(
    expired.client
      .query(api.routes.media.page.run, { paginationOpts: { cursor: null, numItems: 1 } })
      .then((result) => result.page)
  ).resolves.toBeDefined();
  const aYearLater = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 365 * 24 * 60 * 60 * 1000);
  onTestFinished(() => aYearLater.mockRestore());
  await expect(
    expired.client
      .query(api.routes.media.page.run, { paginationOpts: { cursor: null, numItems: 1 } })
      .then((result) => result.page)
  ).rejects.toThrow('Not authenticated');
});

test('ignores a session that belongs to someone else', async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Member');
  const { data } = await owner.authClient.getSession();
  if (!data) throw new Error('The owner has no session');
  const accessAs = (userId: string) =>
    owner.client.run((ctx) =>
      ctx.runQuery(components.betterAuth.workspace.access, { sessionId: data.session.id, userId })
    );
  await expect(accessAs(owner.userId)).resolves.not.toBeNull();
  await expect(accessAs(member.userId)).resolves.toBeNull();
});

test('roster includes the authenticated caller and teammates in the active organization', async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Member');
  const roster = await owner.client.run(async (ctx) => {
    const workspace = await requireWorkspace(ctx);
    return await workspaceRoster(ctx, workspace);
  });

  expect(roster.members.map((entry) => entry.userId).sort()).toEqual(
    [member.userId, owner.userId].sort()
  );
  expect(roster.members.every((entry) => typeof entry.handle === 'string')).toBe(true);
});

test('recognizes Better Auth owner and admin role lists', () => {
  expect(isOrganizationManager(undefined)).toBe(false);
  expect(isOrganizationManager('member')).toBe(false);
  expect(isOrganizationManager('member, admin')).toBe(true);
  expect(isOrganizationManager('owner')).toBe(true);
});
