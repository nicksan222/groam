import { ConvexError } from 'convex/values';
import {
  assertOrganizationManager,
  getBetterAuth,
  type Workspace
} from '#convex/modules/auth/workspace';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 12;
const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const EXPIRED_CODE_CLEANUP_LIMIT = 50;
const MAX_ACTIVE_CODES = 100;

export type InvitationRole = 'admin' | 'member';

const BETTER_AUTH_INVITATION_ERRORS = {
  alreadyMember: 'User is already a member of this organization',
  memberLimit: 'Organization membership limit reached',
  organizationNotFound: 'Organization not found'
} as const;

function formatCode(compactCode: string): string {
  return compactCode.match(/.{1,4}/g)?.join('-') ?? compactCode;
}

export function normalizeInvitationCode(code: string): string {
  return code.toUpperCase().replaceAll(/[^A-Z0-9]/g, '');
}

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

function invitationCodeRecord(invitation: {
  _creationTime: number;
  _id: Id<'organizationInvitationCodes'>;
  code: string;
  expiresAt: number;
  role: InvitationRole;
}) {
  return {
    code: formatCode(invitation.code),
    createdAt: invitation._creationTime,
    expiresAt: invitation.expiresAt,
    id: invitation._id,
    role: invitation.role
  };
}

export async function createInvitationCode(
  ctx: MutationCtx,
  workspace: Workspace,
  role: InvitationRole
) {
  assertOrganizationManager(workspace);
  const now = Date.now();
  const expiredInvitations = await ctx.db
    .query('organizationInvitationCodes')
    .withIndex('by_organizationId_and_expiresAt', (query) =>
      query.eq('organizationId', workspace.organizationId).lte('expiresAt', now)
    )
    .take(EXPIRED_CODE_CLEANUP_LIMIT);
  await Promise.all(expiredInvitations.map((invitation) => ctx.db.delete(invitation._id)));

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    const collision = await ctx.db
      .query('organizationInvitationCodes')
      .withIndex('by_code', (query) => query.eq('code', code))
      .unique();
    if (collision) continue;

    const activeInvitations = await ctx.db
      .query('organizationInvitationCodes')
      .withIndex('by_organizationId_and_expiresAt', (query) =>
        query.eq('organizationId', workspace.organizationId).gt('expiresAt', now)
      )
      .order('asc')
      .take(MAX_ACTIVE_CODES);
    if (activeInvitations.length === MAX_ACTIVE_CODES) {
      await ctx.db.delete(activeInvitations[0]._id);
    }

    const id = await ctx.db.insert('organizationInvitationCodes', {
      code,
      createdBy: workspace.userId,
      expiresAt: now + INVITATION_LIFETIME_MS,
      organizationId: workspace.organizationId,
      role
    });
    const invitation = await ctx.db.get('organizationInvitationCodes', id);
    if (!invitation) throw new ConvexError('Unable to create invitation code');
    return invitationCodeRecord(invitation);
  }

  throw new ConvexError('Unable to create a unique invitation code');
}

export async function listInvitationCodes(ctx: QueryCtx, workspace: Workspace, now: number) {
  assertOrganizationManager(workspace);
  const invitations = await ctx.db
    .query('organizationInvitationCodes')
    .withIndex('by_organizationId_and_expiresAt', (query) =>
      query.eq('organizationId', workspace.organizationId).gt('expiresAt', now)
    )
    .order('desc')
    .take(MAX_ACTIVE_CODES);
  return invitations.map(invitationCodeRecord);
}

export async function deleteOrganizationInvitationCodes(
  ctx: MutationCtx,
  organizationId: string,
  limit: number
): Promise<boolean> {
  const invitations = await ctx.db
    .query('organizationInvitationCodes')
    .withIndex('by_organizationId', (query) => query.eq('organizationId', organizationId))
    .take(limit);
  await Promise.all(invitations.map((invitation) => ctx.db.delete(invitation._id)));
  return invitations.length > 0;
}

export async function revokeInvitationCode(
  ctx: MutationCtx,
  workspace: Workspace,
  invitationCodeId: Id<'organizationInvitationCodes'>
): Promise<null> {
  assertOrganizationManager(workspace);
  const invitation = await ctx.db.get('organizationInvitationCodes', invitationCodeId);
  if (!invitation || invitation.organizationId !== workspace.organizationId) {
    throw new ConvexError('Invitation code not found');
  }
  await ctx.db.delete('organizationInvitationCodes', invitation._id);
  return null;
}

export async function redeemInvitationCode(ctx: MutationCtx, rawCode: string) {
  const authAccess = await getBetterAuth(ctx);
  const session = await authAccess.auth.api.getSession({ headers: authAccess.headers });
  if (!session) throw new ConvexError('Not authenticated');

  const code = normalizeInvitationCode(rawCode);
  if (code.length !== CODE_LENGTH) throw new ConvexError('Enter a valid invitation code');

  const invitation = await ctx.db
    .query('organizationInvitationCodes')
    .withIndex('by_code', (query) => query.eq('code', code))
    .unique();
  if (!invitation) throw new ConvexError('Invitation code not found or already used');
  if (invitation.expiresAt <= Date.now()) {
    throw new ConvexError('This invitation code has expired');
  }

  const organizations = await authAccess.auth.api.listOrganizations({
    headers: authAccess.headers
  });
  if (organizations.some((organization) => organization.id === invitation.organizationId)) {
    return { membership: 'existing' as const, organizationId: invitation.organizationId };
  }

  try {
    await authAccess.auth.api.addMember({
      body: {
        organizationId: invitation.organizationId,
        role: invitation.role,
        userId: session.user.id
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes(BETTER_AUTH_INVITATION_ERRORS.alreadyMember)) {
      return { membership: 'existing' as const, organizationId: invitation.organizationId };
    }
    if (message.includes(BETTER_AUTH_INVITATION_ERRORS.memberLimit)) {
      throw new ConvexError('This group has reached its member limit');
    }
    if (message.includes(BETTER_AUTH_INVITATION_ERRORS.organizationNotFound)) {
      throw new ConvexError('This group is no longer available');
    }
    throw new ConvexError('Unable to join this group. Try again.');
  }
  await ctx.db.delete('organizationInvitationCodes', invitation._id);
  return { membership: 'joined' as const, organizationId: invitation.organizationId };
}

export const OrganizationInvitations = {
  create: createInvitationCode,
  deleteOrganization: deleteOrganizationInvitationCodes,
  list: listInvitationCodes,
  redeem: redeemInvitationCode,
  revoke: revokeInvitationCode
};
