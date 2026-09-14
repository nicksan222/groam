import { ConvexError } from 'convex/values';
import {
  customAction,
  customCtx,
  customMutation,
  customQuery
} from 'convex-helpers/server/customFunctions';
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

async function getBetterAuth(ctx: WorkspaceFunctionCtx) {
  return await authComponent.getAuth(createAuth, ctx);
}

type BetterAuthAccess = Awaited<ReturnType<typeof getBetterAuth>>;
type BetterAuthSession = NonNullable<
  Awaited<ReturnType<BetterAuthAccess['auth']['api']['getSession']>>
>;

export type OrganizationRosterMember = {
  email: string;
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

function requireActiveOrganizationId(session: BetterAuthSession['session']): string {
  const organizationId =
    'activeOrganizationId' in session ? session.activeOrganizationId : undefined;
  if (typeof organizationId !== 'string' || organizationId.length === 0) {
    throw new ConvexError('No active organization');
  }
  return organizationId;
}

export async function requireWorkspace(ctx: WorkspaceFunctionCtx): Promise<Workspace> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new ConvexError('Not authenticated');
  }

  const authAccess = await getBetterAuth(ctx);
  const authSession = await authAccess.auth.api.getSession({ headers: authAccess.headers });
  if (!authSession) {
    throw new ConvexError('Not authenticated');
  }

  const organizationId = requireActiveOrganizationId(authSession.session);
  const organizationMembership = await authAccess.auth.api
    .getActiveMemberRole({ headers: authAccess.headers, query: { organizationId } })
    .catch(() => {
      throw new ConvexError('Organization access denied');
    });

  return {
    organizationId,
    organizationRole: organizationMembership.role,
    tokenIdentifier: identity.tokenIdentifier,
    userId: authSession.user.id,
    viewerName: authSession.user.name
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
      email: member.user.email,
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
