import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import {
  isTripAdmin,
  loadTripContext,
  type TripCtx,
  type TripRole
} from '#convex/modules/travel/trips/ctx';

/** Loads an issue with the viewer's trip; an issue of another workspace reads as missing. */
export async function issueWithTrip<Ctx extends MutationCtx | QueryCtx>(
  ctx: Ctx,
  issueId: Id<'tripIssues'>
) {
  const issue = await ctx.db.get('tripIssues', issueId);
  if (!issue) throw new ConvexError('Trip issue not found');
  const trip = await loadTripContext(ctx, issue.tripId);
  if (issue.organizationId !== trip.workspace.organizationId) {
    throw new ConvexError('Trip issue not found');
  }
  return { issue, trip };
}

export function assertTripWritable(trip: TripCtx): void {
  if (trip.trip.archive !== undefined) throw new ConvexError('Archived trips are read-only');
}

/** `issueWithTrip` for writes that an archived trip refuses. */
export async function writableIssueWithTrip(ctx: MutationCtx, issueId: Id<'tripIssues'>) {
  const loaded = await issueWithTrip(ctx, issueId);
  assertTripWritable(loaded.trip);
  return loaded;
}

/** The author, or someone who administers the trip. */
export function isAuthorOrAdmin(issue: Doc<'tripIssues'>, trip: TripCtx): boolean {
  return isTripAdmin(trip) || issue.author.userId === trip.workspace.userId;
}

/** Trims and bounds free text; the message names what was being entered. */
export function boundedText(value: string, maximum: number, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximum) {
    throw new ConvexError(`${label} must contain 1 to ${maximum} characters`);
  }
  return normalized;
}

export type Viewer = { archived: boolean; role: TripRole; userId: string };

export function viewerOf(trip: TripCtx): Viewer {
  return {
    archived: trip.trip.archive !== undefined,
    role: trip.role,
    userId: trip.workspace.userId
  };
}

/** Only the author or an organizer may change status or board position; archived is read-only. */
export function canManageIssue(issue: Doc<'tripIssues'>, viewer: Viewer): boolean {
  return !viewer.archived && (issue.author.userId === viewer.userId || viewer.role === 'organizer');
}

/** Only organizers assign issues (as `setAssignee` enforces); archived is read-only. */
export function canAssignIssue(viewer: Viewer): boolean {
  return !viewer.archived && viewer.role === 'organizer';
}

/** Any trip member may comment (as `addComment` enforces); archived is read-only. */
export function canCommentOnIssue(viewer: Viewer): boolean {
  return !viewer.archived;
}

/** The name and id a system comment or run is attributed to. */
export function actorOf(trip: TripCtx) {
  return { name: trip.workspace.viewerName, userId: trip.workspace.userId };
}
