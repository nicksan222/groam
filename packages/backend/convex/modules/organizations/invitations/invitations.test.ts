import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { createTestUser } from '#testing/factory';
import { setupGroup } from '#testing/trips';

test('creates and redeems a one-time organization invitation code', {
  timeout: 15_000
}, async () => {
  const { owner } = await setupGroup();
  const invitedUser = await createTestUser(owner.test, {
    email: `invited-${crypto.randomUUID()}@example.com`,
    name: 'Invited Traveler'
  });

  const invitation = await owner.client.mutation(api.routes.organizations.invitations.create.run, {
    role: 'admin'
  });

  expect(invitation.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  await expect(
    invitedUser.client.mutation(api.routes.organizations.invitations.redeem.run, {
      code: invitation.code.toLowerCase().replaceAll('-', ' ')
    })
  ).resolves.toEqual({ organizationId: owner.organizationId });

  await expect(
    invitedUser.authClient.organization.setActive({ organizationId: owner.organizationId! })
  ).resolves.toMatchObject({ error: null });
  const activeOrganization = await invitedUser.authClient.organization.getFullOrganization();
  expect(
    activeOrganization.data?.members.find((member) => member.userId === invitedUser.userId)?.role
  ).toBe('admin');

  await expect(
    invitedUser.client.mutation(api.routes.organizations.invitations.redeem.run, {
      code: invitation.code
    })
  ).rejects.toThrow('Invitation code not found or already used');
});

test('only managers can create, list, and revoke invitation codes', {
  timeout: 15_000
}, async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Regular Member');
  const invitation = await owner.client.mutation(api.routes.organizations.invitations.create.run, {
    role: 'member'
  });

  await expect(
    member.client.mutation(api.routes.organizations.invitations.create.run, { role: 'member' })
  ).rejects.toThrow('Only organization owners and admins');
  await expect(
    member.client.query(api.routes.organizations.invitations.list.run, { now: Date.now() })
  ).rejects.toThrow('Only organization owners and admins');

  await owner.client.mutation(api.routes.organizations.invitations.revoke.run, {
    invitationCodeId: invitation.id
  });
  await expect(
    owner.client.query(api.routes.organizations.invitations.list.run, { now: Date.now() })
  ).resolves.toEqual([]);
});
