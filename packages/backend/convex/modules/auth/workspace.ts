import {
  customAction,
  customCtx,
  customMutation,
  customQuery
} from 'convex-helpers/server/customFunctions';
import { ConvexError, v } from 'convex/values';
import { components, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
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
import { authComponent, createAuth, ORGANIZATION_MEMBERSHIP_LIMIT } from './auth';

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
  /** Set when an agent turn acts for its run's creator. */
  runId?: Id<'agentRuns'>;
};

function isWorkspace(value: unknown): value is Workspace {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Workspace>;
  return (
    typeof candidate.organizationId === 'string' &&
    typeof candidate.organizationRole === 'string' &&
    typeof candidate.tokenIdentifier === 'string' &&
    typeof candidate.userId === 'string' &&
    typeof candidate.viewerName === 'string'
  );
}

/**
 * A workspace a builder or trip context already resolved for this same call. Only server code
 * binds `ctx.workspace` (public builders from identity, internal builders from identity or an
 * active run), never client input. A system workspace is not reused: scheduled system work that
 * asks for a viewer still has none.
 */
function boundWorkspace(ctx: WorkspaceFunctionCtx): Workspace | null {
  const candidate = (ctx as { workspace?: unknown }).workspace;
  if (!isWorkspace(candidate) || candidate.tokenIdentifier === SYSTEM_TOKEN_IDENTIFIER) return null;
  return candidate;
}

export async function requireWorkspace(ctx: WorkspaceFunctionCtx): Promise<Workspace> {
  const bound = boundWorkspace(ctx);
  if (bound) return bound;
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

/** Marks a workspace built by the server for a group, with no signed-in viewer behind it. */
export const SYSTEM_TOKEN_IDENTIFIER = 'system:groam';

export function systemWorkspace(organizationId: string): Workspace {
  return {
    organizationId,
    organizationRole: 'member',
    tokenIdentifier: SYSTEM_TOKEN_IDENTIFIER,
    userId: SYSTEM_TOKEN_IDENTIFIER,
    viewerName: 'Groam'
  };
}

/** The roster read straight from the Better Auth component, as scheduled work has no session. */
export async function systemRoster(
  ctx: WorkspaceFunctionCtx,
  organizationId: string
): Promise<OrganizationRoster> {
  const members = await ctx.runQuery(components.betterAuth.adapter.findMany, {
    model: 'member',
    paginationOpts: { cursor: null, numItems: ORGANIZATION_MEMBERSHIP_LIMIT },
    where: [{ field: 'organizationId', value: organizationId }]
  });
  const roster = await Promise.all(
    members.page.map(async (member: { role: string; userId: string }) => {
      const user = await authComponent.getAnyUserById(ctx, member.userId);
      if (!user) return null;
      return {
        handle:
          'username' in user && typeof user.username === 'string' ? `@${user.username}` : user.name,
        image: user.image ?? null,
        name: user.name,
        organizationRole: member.role,
        userId: member.userId
      };
    })
  );
  return { members: roster.filter((member) => member !== null) };
}

export async function workspaceRoster(
  ctx: WorkspaceFunctionCtx,
  workspace: Workspace
): Promise<OrganizationRoster> {
  if (workspace.tokenIdentifier === SYSTEM_TOKEN_IDENTIFIER || workspace.runId !== undefined) {
    return await systemRoster(ctx, workspace.organizationId);
  }
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

/** Optional arg internal builders accept so an agent turn can act for its run's creator. */
export const runActorArgs = { asRun: v.optional(v.id('agentRuns')) };

export type RunActor = {
  organizationId: string;
  tokenIdentifier: string;
  userId: string;
  viewerName: string;
};

/** Reads the actor of a run that is mid-turn. Pure db read so queries and mutations share it. */
export async function loadRunActor(
  ctx: AuthContext,
  runId: Id<'agentRuns'>
): Promise<RunActor | null> {
  const run = await ctx.db.get('agentRuns', runId);
  if (run?.status !== 'running') return null;
  return {
    organizationId: run.organizationId,
    // Runs queued before actor tokens were stored use the user id as their thread user.
    tokenIdentifier: run.actorTokenIdentifier ?? run.createdBy.userId,
    userId: run.createdBy.userId,
    viewerName: run.createdBy.name
  };
}

async function runActorWorkspace(
  ctx: WorkspaceFunctionCtx,
  runId: Id<'agentRuns'>
): Promise<Workspace> {
  const actor =
    'db' in ctx
      ? await loadRunActor(ctx, runId)
      : await ctx.runQuery(internal.modules.auth.actor.load, { runId });
  if (!actor) throw new ConvexError('Agent run is not active');
  const member = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: 'member',
    select: ['role'],
    where: [
      { field: 'organizationId', value: actor.organizationId },
      { field: 'userId', value: actor.userId }
    ]
  })) as { role?: string } | null;
  if (!member?.role) throw new ConvexError('Organization access denied');
  return {
    organizationId: actor.organizationId,
    organizationRole: member.role,
    runId,
    tokenIdentifier: actor.tokenIdentifier,
    userId: actor.userId,
    viewerName: actor.viewerName
  };
}

/**
 * Identity wins; with none, an active run's creator is the actor. Only internal builders call
 * this with `asRun`, so a client can never pick the run it acts for.
 */
export async function requireActor(
  ctx: WorkspaceFunctionCtx,
  asRun?: Id<'agentRuns'>
): Promise<Workspace> {
  if (asRun === undefined || (await ctx.auth.getUserIdentity()) !== null) {
    return await requireWorkspace(ctx);
  }
  return await runActorWorkspace(ctx, asRun);
}

const workspaceCtx = customCtx(async (ctx: WorkspaceFunctionCtx) => ({
  workspace: await requireWorkspace(ctx)
}));

const actorWorkspaceCtx = {
  args: runActorArgs,
  input: async (ctx: WorkspaceFunctionCtx, { asRun }: { asRun?: Id<'agentRuns'> }) => ({
    args: {},
    ctx: { workspace: await requireActor(ctx, asRun) }
  })
};

/**
 * Plain internal mutation that binds the run actor only when `asRun` is passed: for helpers an
 * internal actor-aware action calls on behalf of a turn (identity callers are unchanged).
 */
export const internalOptionalActorMutation = customMutation(internalMutation, {
  args: runActorArgs,
  input: async (ctx: MutationCtx, { asRun }: { asRun?: Id<'agentRuns'> }) => ({
    args: {},
    ctx: asRun === undefined ? {} : { workspace: await requireActor(ctx, asRun) }
  })
});

export const workspaceQuery = customQuery(query, workspaceCtx);
export const workspaceMutation = customMutation(mutation, workspaceCtx);
export const workspaceAction = customAction(action, workspaceCtx);
export const internalWorkspaceQuery = customQuery(internalQuery, actorWorkspaceCtx);
export const internalWorkspaceMutation = customMutation(internalMutation, actorWorkspaceCtx);
export const internalWorkspaceAction = customAction(internalAction, actorWorkspaceCtx);
