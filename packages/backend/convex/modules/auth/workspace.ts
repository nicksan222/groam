import {
  customAction,
  customCtx,
  customMutation,
  customQuery
} from 'convex-helpers/server/customFunctions';
import { ConvexError } from 'convex/values';
import { components } from '#convex-generated/api';
import {
  type ActionCtx,
  action,
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query
} from '#convex-generated/server';
import { authComponent, createAuth } from './auth';

export type AuthContext = MutationCtx | QueryCtx;
export type WorkspaceFunctionCtx = ActionCtx | MutationCtx | QueryCtx;

const ORGANIZATION_MANAGER_ROLES = new Set(['admin', 'owner']);

export async function getBetterAuth(ctx: WorkspaceFunctionCtx) {
  return await authComponent.getAuth(createAuth, ctx);
}

export type OrganizationRosterMember = {
  handle: string;
  image: string | null;
  name: string;
  organizationRole: string;
  userId: string;
};

export type OrganizationRoster = {
  members: OrganizationRosterMember[];
};

export type Workspace = {
  organizationId: string;
  organizationRole: string;
  tokenIdentifier: string;
  userId: string;
  viewerName: string;
};

export async function requireWorkspace(ctx: WorkspaceFunctionCtx): Promise<Workspace> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null || typeof identity.sessionId !== 'string') {
    throw new ConvexError('Not authenticated');
  }

  const access = await ctx.runQuery(components.betterAuth.workspace.access, {
    sessionId: identity.sessionId,
    userId: identity.subject
  });
  // As Better Auth's getSession does, a session past its expiry no longer signs anyone in. Reading
  // the clock is fine here: it matches getSession, and token refresh bounds how stale a query gets.
  if (access === null || access.expiresAt <= Date.now()) {
    throw new ConvexError('Not authenticated');
  }
  if (!access.activeOrganizationId) {
    throw new ConvexError('No active organization');
  }
  if (access.role === null) {
    throw new ConvexError('Organization access denied');
  }

  return {
    organizationId: access.activeOrganizationId,
    organizationRole: access.role,
    tokenIdentifier: identity.tokenIdentifier,
    userId: identity.subject,
    viewerName: access.userName
  };
}

export function isOrganizationManager(role: string | undefined): boolean {
  return role?.split(',').some((value) => ORGANIZATION_MANAGER_ROLES.has(value.trim())) ?? false;
}

export function assertOrganizationManager(workspace: Workspace): void {
  if (!isOrganizationManager(workspace.organizationRole)) {
    throw new ConvexError('Only organization owners and admins can manage group settings');
  }
}

export async function hasOrganizationMembership(
  ctx: WorkspaceFunctionCtx,
  organizationId: string,
  userId: string
): Promise<boolean> {
  const membership = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: 'member',
    select: ['_id'],
    where: [
      { field: 'organizationId', value: organizationId },
      { field: 'userId', value: userId }
    ]
  });
  return membership !== null;
}

export async function workspaceRoster(
  ctx: WorkspaceFunctionCtx,
  workspace: Workspace
): Promise<OrganizationRoster> {
  const authAccess = await getBetterAuth(ctx);
  const roster = await authAccess.auth.api.listMembers({
    headers: authAccess.headers,
    query: { limit: 100, organizationId: workspace.organizationId }
  });
  if (!roster.members.some((member) => member.userId === workspace.userId)) {
    throw new ConvexError('Organization access denied');
  }

  return {
    members: roster.members.map((member) => ({
      handle:
        'username' in member.user && typeof member.user.username === 'string'
          ? `@${member.user.username}`
          : member.user.name,
      image: member.user.image ?? null,
      name: member.user.name,
      organizationRole: member.role,
      userId: member.userId
    }))
  };
}

export async function updateOrganizationLogo(
  ctx: WorkspaceFunctionCtx,
  workspace: Workspace,
  logo: string | null
): Promise<void> {
  assertOrganizationManager(workspace);
  const authAccess = await getBetterAuth(ctx);
  const organization = await authAccess.auth.api.updateOrganization({
    body: { data: { logo }, organizationId: workspace.organizationId },
    headers: authAccess.headers
  });
  if (!organization) throw new ConvexError('Unable to update group logo');
}

const workspaceCtx = customCtx(async (ctx: WorkspaceFunctionCtx) => ({
  workspace: await requireWorkspace(ctx)
}));

export const workspaceQuery = customQuery(query, workspaceCtx);
export const workspaceMutation = customMutation(mutation, workspaceCtx);
export const workspaceAction = customAction(action, workspaceCtx);
export const internalWorkspaceQuery = customQuery(internalQuery, workspaceCtx);
export const internalWorkspaceMutation = customMutation(internalMutation, workspaceCtx);
export const internalWorkspaceAction = customAction(internalAction, workspaceCtx);
