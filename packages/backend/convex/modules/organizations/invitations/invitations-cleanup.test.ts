import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { OrganizationInvitations } from '#convex/modules/organizations/invitations/index';
import { createOutsiderClient } from '#testing/factory';
import { setupGroup } from '#testing/trips';

const invitations = api.routes.organizations.invitations;

test(
  'creating a code sweeps expired ones and revoke stays in the group',
  { timeout: 30_000 },
  async () => {
    const { owner } = await setupGroup();
    const organizationId = owner.organizationId!;
    const expiredId = await owner.test.run((ctx) =>
      ctx.db.insert('organizationInvitationCodes', {
        code: 'EXPIRED23456',
        createdBy: owner.userId,
        expiresAt: Date.now() - 1,
        organizationId,
        role: 'member'
      })
    );
    const created = await owner.client.mutation(invitations.create.run, { role: 'member' });
    await expect(
      owner.test.run((ctx) => ctx.db.get('organizationInvitationCodes', expiredId))
    ).resolves.toBeNull();

    const outsider = await createOutsiderClient(owner.test);
    await expect(
      outsider.client.mutation(invitations.revoke.run, { invitationCodeId: created.id })
    ).rejects.toThrow('Invitation code not found');
    await owner.client.mutation(invitations.revoke.run, { invitationCodeId: created.id });
    await expect(
      owner.client.mutation(invitations.revoke.run, { invitationCodeId: created.id })
    ).rejects.toThrow('Invitation code not found');

    await owner.client.mutation(invitations.create.run, { role: 'admin' });
    await owner.test.run(async (ctx) => {
      expect(await OrganizationInvitations.deleteOrganization(ctx, organizationId, 10)).toBe(true);
      expect(await OrganizationInvitations.deleteOrganization(ctx, organizationId, 10)).toBe(false);
    });
  }
);
