import { ConvexError, type Infer, v } from 'convex/values';
import { customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import { type AuthContext, requireWorkspace, type Workspace } from '#convex/modules/auth/workspace';
import {
  assertMutable,
  assertPlanner,
  isSeedWrite,
  roleFor
} from '#convex/modules/travel/trips/access';
import type { TripValidators } from '#convex/modules/travel/trips/schema';
import { IdeaNames } from '#convex/modules/travel/versions/names';
import { internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query
} from '#convex-generated/server';

const TITLE_GENERATION_DELAY_MS = 30_000;

export const MAX_ACTIVITY_ITEMS = 30;
export const MAX_GROUP_MEMBERS = 100;

export {
  assertDayWithinTrip,
  assertMutable,
  assertPlanner,
  isSeedWrite,
  isTripAdmin,
  roleFor,
  totalDays,
  tripPermissions,
  withSeedWrites
} from '#convex/modules/travel/trips/access';
export type TripRole = Infer<typeof TripValidators.role>;
export type TripReadCtx = MutationCtx | QueryCtx;

export type TripCtx<Ctx extends TripReadCtx = TripReadCtx> = Ctx & {
  role: TripRole;
  trip: Doc<'trips'>;
  workspace: Workspace;
};

export type MutableTripCtx = TripCtx<MutationCtx>;

const PRESERVE_IDEA_REVIEW = Symbol('preserveIdeaReview');
type PatchTripCtx = MutableTripCtx & { [PRESERVE_IDEA_REVIEW]?: true };

export function preserveIdeaReview(ctx: MutableTripCtx): MutableTripCtx {
  return { ...ctx, [PRESERVE_IDEA_REVIEW]: true } as PatchTripCtx;
}
export type TripQueryCtx = TripCtx<QueryCtx>;

export type DestinationMutationCtx = MutableTripCtx & {
  destination: Doc<'tripDestinations'>;
};

export function attachTrip<Ctx extends TripReadCtx>(
  ctx: Ctx,
  trip: Doc<'trips'>,
  workspace: Workspace,
  role: TripRole
): TripCtx<Ctx> {
  return { ...ctx, role, trip, workspace };
}

export async function loadTripContext<Ctx extends AuthContext & TripReadCtx>(
  ctx: Ctx,
  tripId: Id<'trips'>,
  workspace?: Workspace
): Promise<TripCtx<Ctx>> {
  const resolvedWorkspace = workspace ?? (await requireWorkspace(ctx));
  const data = await ctx.db.get('trips', tripId);
  if (!data || data.organizationId !== resolvedWorkspace.organizationId) {
    throw new ConvexError('Trip not found');
  }
  const role = roleFor(data, resolvedWorkspace.userId, resolvedWorkspace.organizationRole);
  return attachTrip(ctx, data, resolvedWorkspace, role);
}

export function sharedTripId(trip: Doc<'trips'>): Id<'trips'> {
  return trip.proposal?.sourceTripId ?? trip._id;
}

export async function loadSharedTripContext<Ctx extends AuthContext & TripReadCtx>(
  ctx: Ctx,
  tripId: Id<'trips'>,
  workspace?: Workspace
): Promise<TripCtx<Ctx>> {
  const loaded = await loadTripContext(ctx, tripId, workspace);
  const sourceId = sharedTripId(loaded.trip);
  if (sourceId === loaded.trip._id) return loaded;
  return loadTripContext(ctx, sourceId, loaded.workspace);
}

export async function loadMutableTrip(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  workspace?: Workspace
): Promise<MutableTripCtx> {
  const loaded = await loadTripContext(ctx, tripId, workspace);
  assertMutable(loaded);
  return loaded;
}

export function hasTravelPeriod(data: Doc<'trips'>): boolean {
  return data.startDate !== undefined || data.dateNotes !== undefined;
}

export function nextActionFor(data: Doc<'trips'>) {
  if (data.archive !== undefined) {
    return { nextAction: 'Restore this trip to continue planning', outstandingActionCount: 0 };
  }
  const travelPeriod = hasTravelPeriod(data);
  const outstandingActionCount =
    Number(data.destination.status === 'undecided') + Number(!travelPeriod);
  if (data.destination.status === 'undecided') {
    return { nextAction: 'Decide on a destination', outstandingActionCount };
  }
  if (!travelPeriod) {
    return { nextAction: 'Agree on the travel period', outstandingActionCount };
  }
  return { nextAction: 'Continue planning together', outstandingActionCount };
}

async function scheduleDraftTitleGeneration(
  ctx: MutationCtx,
  workingTripId: Id<'trips'>
): Promise<void> {
  const proposal = await ctx.db
    .query('tripProposals')
    .withIndex('by_workingTripId', (query) => query.eq('workingTripId', workingTripId))
    .unique();
  if (proposal?.status !== 'draft') return;
  if (!IdeaNames.allowsAutoTitle(proposal)) return;

  const generation = (proposal.titleGeneration ?? 0) + 1;
  await ctx.db.patch('tripProposals', proposal._id, { titleGeneration: generation });
  await ctx.scheduler.runAfter(
    TITLE_GENERATION_DELAY_MS,
    internal.modules.travel.versions.agent.title.action.run,
    { generation, proposalId: proposal._id }
  );
}

async function invalidateIdeaReviewAfterEdit(ctx: MutableTripCtx): Promise<void> {
  if ((ctx as PatchTripCtx)[PRESERVE_IDEA_REVIEW]) return;
  const status = ctx.trip.proposal?.status;
  if (status !== 'in_review' && status !== 'conflicted') return;
  const proposal = await ctx.db
    .query('tripProposals')
    .withIndex('by_workingTripId', (query) => query.eq('workingTripId', ctx.trip._id))
    .unique();
  if (!proposal) throw new ConvexError('Idea trip not found');
  const approvals = await ctx.db
    .query('tripProposalApprovals')
    .withIndex('by_proposalId', (query) => query.eq('proposalId', proposal._id))
    .take(MAX_GROUP_MEMBERS + 1);
  if (approvals.length > MAX_GROUP_MEMBERS) {
    throw new ConvexError(`Ideas support up to ${MAX_GROUP_MEMBERS} approvals`);
  }
  await Promise.all([
    ...approvals.map((approval) => ctx.db.delete('tripProposalApprovals', approval._id)),
    ctx.db.patch('tripProposals', proposal._id, {
      ...(status === 'conflicted' ? { conflictWorkingUpdatedAt: ctx.trip.updatedAt } : {}),
      groamReview: undefined,
      updatedAt: ctx.trip.updatedAt
    })
  ]);
}
export async function patchTrip(
  ctx: MutableTripCtx,
  value: Partial<Omit<Doc<'trips'>, '_creationTime' | '_id'>>
): Promise<void> {
  const updatedAt =
    value.updatedAt === undefined ? undefined : Math.max(value.updatedAt, ctx.trip.updatedAt + 1);
  await ctx.db.patch('trips', ctx.trip._id, {
    ...value,
    ...(updatedAt === undefined ? {} : { updatedAt })
  });
  ctx.trip = { ...ctx.trip, ...value, ...(updatedAt === undefined ? {} : { updatedAt }) };
  await invalidateIdeaReviewAfterEdit(ctx);
  if (ctx.trip.proposal?.status === 'draft' && !isSeedWrite()) {
    await scheduleDraftTitleGeneration(ctx, ctx.trip._id);
  }
}

export async function recordActivity(
  ctx: MutableTripCtx,
  type: Doc<'tripAuditEvents'>['type'],
  message: string
): Promise<void> {
  await ctx.db.insert('tripAuditEvents', {
    actor: { name: ctx.workspace.viewerName, userId: ctx.workspace.userId },
    message,
    tripId: ctx.trip._id,
    type
  });
  const recentActivity = await ctx.db
    .query('tripAuditEvents')
    .withIndex('by_tripId', (query) => query.eq('tripId', ctx.trip._id))
    .order('desc')
    .take(MAX_ACTIVITY_ITEMS + 1);
  const oldest = recentActivity[MAX_ACTIVITY_ITEMS];
  if (oldest) await ctx.db.delete('tripAuditEvents', oldest._id);
}

export async function archiveTrip(ctx: MutableTripCtx): Promise<null> {
  assertPlanner(ctx);
  if (ctx.trip.proposal) throw new ConvexError('Close ideas from the Ideas tab');
  if (ctx.trip.archive !== undefined) return null;
  const updatedAt = Date.now();
  await patchTrip(ctx, { archive: { at: updatedAt }, updatedAt });
  await recordActivity(ctx, 'trip_archived', `${ctx.workspace.viewerName} archived the trip`);
  return null;
}

export async function restoreTrip(ctx: MutableTripCtx): Promise<null> {
  assertPlanner(ctx);
  if (ctx.trip.proposal) throw new ConvexError('Idea trips cannot be restored');
  if (ctx.trip.archive === undefined) return null;
  await patchTrip(ctx, { archive: undefined, updatedAt: Date.now() });
  await recordActivity(ctx, 'trip_restored', `${ctx.workspace.viewerName} restored the trip`);
  return null;
}

function boundTrip(loaded: TripCtx) {
  return { role: loaded.role, trip: loaded.trip, workspace: loaded.workspace };
}

async function tripQueryInput(ctx: QueryCtx, tripId: Id<'trips'>) {
  return { args: {}, ctx: boundTrip(await loadTripContext(ctx, tripId)) };
}

async function tripMutationInput(ctx: MutationCtx, tripId: Id<'trips'>) {
  return { args: {}, ctx: boundTrip(await loadTripContext(ctx, tripId)) };
}

async function sharedTripQueryInput(ctx: QueryCtx, tripId: Id<'trips'>) {
  return { args: {}, ctx: boundTrip(await loadSharedTripContext(ctx, tripId)) };
}

async function sharedTripMutationInput(ctx: MutationCtx, tripId: Id<'trips'>) {
  return { args: {}, ctx: boundTrip(await loadSharedTripContext(ctx, tripId)) };
}

async function mutableTripMutationInput(ctx: MutationCtx, tripId: Id<'trips'>) {
  return { args: {}, ctx: boundTrip(await loadMutableTrip(ctx, tripId)) };
}

const tripIdArgs = { tripId: v.id('trips') };

export const tripQuery = customQuery(query, {
  args: tripIdArgs,
  input: async (ctx, { tripId }) => await tripQueryInput(ctx, tripId)
});

export const tripMutation = customMutation(mutation, {
  args: tripIdArgs,
  input: async (ctx, { tripId }) => await tripMutationInput(ctx, tripId)
});

export const mutableTripMutation = customMutation(mutation, {
  args: tripIdArgs,
  input: async (ctx, { tripId }) => await mutableTripMutationInput(ctx, tripId)
});

export const internalTripQuery = customQuery(internalQuery, {
  args: tripIdArgs,
  input: async (ctx, { tripId }) => await tripQueryInput(ctx, tripId)
});

export const internalTripMutation = customMutation(internalMutation, {
  args: tripIdArgs,
  input: async (ctx, { tripId }) => await tripMutationInput(ctx, tripId)
});

export const internalMutableTripMutation = customMutation(internalMutation, {
  args: tripIdArgs,
  input: async (ctx, { tripId }) => await mutableTripMutationInput(ctx, tripId)
});

export const sharedTripQuery = customQuery(query, {
  args: tripIdArgs,
  input: async (ctx, { tripId }) => await sharedTripQueryInput(ctx, tripId)
});

export const sharedTripMutation = customMutation(mutation, {
  args: tripIdArgs,
  input: async (ctx, { tripId }) => await sharedTripMutationInput(ctx, tripId)
});

export const internalSharedTripQuery = customQuery(internalQuery, {
  args: tripIdArgs,
  input: async (ctx, { tripId }) => await sharedTripQueryInput(ctx, tripId)
});

export const internalSharedTripMutation = customMutation(internalMutation, {
  args: tripIdArgs,
  input: async (ctx, { tripId }) => await sharedTripMutationInput(ctx, tripId)
});

async function destinationArgsInput(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  destinationId: Id<'tripDestinations'>
) {
  const loaded = await loadMutableTrip(ctx, tripId);
  const destination = await loaded.db.get('tripDestinations', destinationId);
  if (!destination || destination.tripId !== tripId) {
    throw new ConvexError('Trip destination not found');
  }
  return { args: {}, ctx: { ...boundTrip(loaded), destination } };
}

const destinationArgs = {
  destinationId: v.id('tripDestinations'),
  tripId: v.id('trips')
};

export const destinationMutation = customMutation(mutation, {
  args: destinationArgs,
  input: async (ctx, { destinationId, tripId }) =>
    await destinationArgsInput(ctx, tripId, destinationId)
});

export const internalDestinationMutation = customMutation(internalMutation, {
  args: destinationArgs,
  input: async (ctx, { destinationId, tripId }) =>
    await destinationArgsInput(ctx, tripId, destinationId)
});
