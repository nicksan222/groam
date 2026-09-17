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
  ).resolves.toEqual({ membership: 'joined', organizationId: owner.organizationId });

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

test('opens an existing membership without consuming the invitation code', {
  timeout: 15_000
}, async () => {
  const { addUser, owner } = await setupGroup();
  const existingMember = await addUser('Existing Member');
  const invitation = await owner.client.mutation(api.routes.organizations.invitations.create.run, {
    role: 'admin'
  });

  await expect(
    existingMember.client.mutation(api.routes.organizations.invitations.redeem.run, {
      code: invitation.code
    })
  ).resolves.toEqual({ membership: 'existing', organizationId: owner.organizationId });

  await expect(
    owner.client.query(api.routes.organizations.invitations.list.run, { now: Date.now() })
  ).resolves.toContainEqual(invitation);

  const organization = await existingMember.authClient.organization.getFullOrganization({
    query: { organizationId: owner.organizationId! }
  });
  expect(
    organization.data?.members.find((member) => member.userId === existingMember.userId)?.role
  ).toBe('member');
});

test('returns actionable errors for unusable invitation codes', { timeout: 15_000 }, async () => {
  const { owner } = await setupGroup();
  const invitedUser = await createTestUser(owner.test, {
    email: `edge-case-${crypto.randomUUID()}@example.com`,
    name: 'Edge Case Traveler'
  });
  const organizationId = owner.organizationId;
  if (!organizationId) throw new Error('Expected an organization');

  await expect(
    invitedUser.client.mutation(api.routes.organizations.invitations.redeem.run, { code: 'short' })
  ).rejects.toThrow('Enter a valid invitation code');
  await expect(
    invitedUser.client.mutation(api.routes.organizations.invitations.redeem.run, {
      code: 'AAAA-BBBB-CCCC'
    })
  ).rejects.toThrow('Invitation code not found or already used');

  await owner.test.run(async (ctx) => {
    await ctx.db.insert('organizationInvitationCodes', {
      code: 'EXPIRED23456',
      createdBy: owner.userId,
      expiresAt: Date.now() - 1,
      organizationId,
      role: 'member'
    });
  });
  await expect(
    invitedUser.client.mutation(api.routes.organizations.invitations.redeem.run, {
      code: 'EXPIRED23456'
    })
  ).rejects.toThrow('This invitation code has expired');
});

test('requires authentication and reports an invitation for a deleted group', {
  timeout: 15_000
}, async () => {
  const { owner } = await setupGroup();
  const invitedUser = await createTestUser(owner.test, {
    email: `missing-group-${crypto.randomUUID()}@example.com`,
    name: 'Missing Group Traveler'
  });
  await owner.test.run(async (ctx) => {
    await ctx.db.insert('organizationInvitationCodes', {
      code: 'MISSING23456',
      createdBy: owner.userId,
      expiresAt: Date.now() + 60_000,
      organizationId: 'deleted-organization',
      role: 'member'
    });
  });

  await expect(
    owner.test.mutation(api.routes.organizations.invitations.redeem.run, {
      code: 'MISSING23456'
    })
  ).rejects.toThrow('Not authenticated');
  await expect(
    invitedUser.client.mutation(api.routes.organizations.invitations.redeem.run, {
      code: 'MISSING23456'
    })
  ).rejects.toThrow('This group is no longer available');
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

test('revokes the oldest code before creating code 101', { timeout: 15_000 }, async () => {
  const { owner } = await setupGroup();
  const organizationId = owner.organizationId;
  if (!organizationId) throw new Error('Expected an organization');
  const now = Date.now();
  const oldestCode = 'CODE00000000';

  await owner.test.run(async (ctx) => {
    await Promise.all(
      Array.from({ length: 100 }, (_, index) =>
        ctx.db.insert('organizationInvitationCodes', {
          code: `CODE${index.toString().padStart(8, '0')}`,
          createdBy: owner.userId,
          expiresAt: now + 1_000_000 + index,
          organizationId,
          role: 'member'
        })
      )
    );
  });

  const newest = await owner.client.mutation(api.routes.organizations.invitations.create.run, {
    role: 'member'
  });
  const visible = await owner.client.query(api.routes.organizations.invitations.list.run, { now });
  const stored = await owner.test.run((ctx) =>
    ctx.db
      .query('organizationInvitationCodes')
      .withIndex('by_organizationId_and_expiresAt', (query) =>
        query.eq('organizationId', organizationId).gt('expiresAt', now)
      )
      .collect()
  );

  expect(visible).toHaveLength(100);
  expect(stored).toHaveLength(100);
  expect(visible.map(({ id }) => id).sort()).toEqual(stored.map(({ _id }) => _id).sort());
  expect(visible.some(({ code }) => code === oldestCode)).toBe(false);
  expect(visible.some(({ id }) => id === newest.id)).toBe(true);
});
