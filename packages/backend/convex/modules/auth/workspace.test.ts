import { expect, test } from 'vitest';
import {
  isOrganizationManager,
  requireWorkspace,
  workspaceRoster
} from '#convex/modules/auth/workspace';
import { api } from '#convex-generated/api';
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
  await expect(withoutSession.query(api.routes.media.list.run, { limit: 1 })).rejects.toThrow(
    'Not authenticated'
  );

  const withoutOrganization = await createAuthenticatedTest();
  await expect(
    withoutOrganization.client.query(api.routes.media.list.run, { limit: 1 })
  ).rejects.toThrow('No active organization');
});

test('denies callers who are no longer members of the active organization', async () => {
  const revoked = await createAuthenticatedTest({
    organization: { membership: 'revoked', name: 'Former Group' }
  });
  await expect(revoked.client.query(api.routes.media.list.run, { limit: 1 })).rejects.toThrow(
    /Organization access denied|No active organization/u
  );
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
