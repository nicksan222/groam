import { ConvexError } from 'convex/values';
import { isOrganizationManager } from '#convex/modules/auth/workspace';
import type { TripCtx, TripRole } from '#convex/modules/travel/trips/ctx';
import type { Doc } from '#convex-generated/dataModel';

export function roleFor(trip: Doc<'trips'>, userId: string, organizationRole?: string): TripRole {
  return trip.creator.userId === userId || isOrganizationManager(organizationRole)
    ? 'organizer'
    : 'participant';
}

export function isTripAdmin(ctx: TripCtx): boolean {
  return ctx.role === 'organizer';
}

export function assertPlanner(ctx: TripCtx): void {
  if (!isTripAdmin(ctx)) {
    throw new ConvexError('You do not have permission to edit this trip');
  }
}

let seedWriteDepth = 0;

/** Lets the local itinerary seeder write onto a shared trip in one transaction. */
export async function withSeedWrites<T>(write: () => Promise<T>): Promise<T> {
  seedWriteDepth += 1;
  try {
    return await write();
  } finally {
    seedWriteDepth -= 1;
  }
}

export function isSeedWrite(): boolean {
  return seedWriteDepth > 0;
}

export function assertMutable(ctx: TripCtx): void {
  if (ctx.trip.archive !== undefined) throw new ConvexError('Archived trips are read-only');
  if (ctx.trip.proposal) {
    if (ctx.trip.proposal.author.userId !== ctx.workspace.userId) {
      throw new ConvexError('Only the idea author can edit this idea trip');
    }
    if (ctx.trip.proposal.status === 'merged' || ctx.trip.proposal.status === 'closed') {
      throw new ConvexError('Closed ideas are read-only');
    }
    return;
  }
  assertPlanner(ctx);
  if (seedWriteDepth > 0) return;
  throw new ConvexError('Start an idea to change this trip');
}

export function totalDays(ctx: TripCtx): number | undefined {
  return (
    ctx.trip.duration?.totalDays ?? ctx.trip.duration?.idealDays ?? ctx.trip.duration?.minimumDays
  );
}

export function assertDayWithinTrip(ctx: TripCtx, day: number | undefined, label: string): void {
  const days = totalDays(ctx);
  if (day !== undefined && days !== undefined && day > days) {
    throw new ConvexError(`${label} must fit within the ${days}-day trip`);
  }
}

export function tripPermissions(ctx: TripCtx) {
  const isArchived = ctx.trip.archive !== undefined;
  const isAdmin = isTripAdmin(ctx);
  const canEdit =
    !isArchived &&
    ctx.trip.proposal !== undefined &&
    ctx.trip.proposal.status !== 'merged' &&
    ctx.trip.proposal.status !== 'closed' &&
    ctx.trip.proposal.author.userId === ctx.workspace.userId;
  return {
    canArchive: isAdmin && !isArchived && !ctx.trip.proposal,
    canEdit,
    canEditCover: canEdit,
    canPropose: !isArchived && !ctx.trip.proposal,
    canRestore: isAdmin && isArchived && !ctx.trip.proposal,
    isReadOnly: !canEdit
  };
}
