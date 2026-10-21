import type { PaginationOptions } from 'convex/server';
import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import { requireWorkspace, type Workspace } from '#convex/modules/auth/workspace';
import { presentAssignee } from '#convex/modules/travel/issues/assignee';
import { compareByRank, rankOf } from '#convex/modules/travel/issues/board';
import {
  commentsOf,
  MAX_COMMENTS,
  MAX_SYSTEM_COMMENTS
} from '#convex/modules/travel/issues/comments';
import {
  type ConditionedIssue,
  conditionedIssuesOf,
  presentCondition,
  type RuleFacts,
  withCondition
} from '#convex/modules/travel/issues/condition';
import { loadConditionFacts } from '#convex/modules/travel/issues/facts';
import {
  canAssignIssue,
  canCommentOnIssue,
  canManageIssue,
  type Viewer,
  viewerOf
} from '#convex/modules/travel/issues/guard';
import { loadTripContext } from '#convex/modules/travel/trips/ctx';

async function linkedProposal(ctx: QueryCtx, issueId: Id<'tripIssues'>) {
  const proposal = await ctx.db
    .query('tripProposals')
    .withIndex('by_issueId', (query) => query.eq('issueId', issueId))
    .order('desc')
    .first();
  return presentIdea(proposal);
}

function presentIdea(proposal: Doc<'tripProposals'> | null | undefined) {
  return proposal
    ? {
        id: proposal._id,
        status: proposal.status,
        title: proposal.title,
        workingTripId: proposal.workingTripId
      }
    : null;
}

/** A trip supports at most this many ideas (see the versions module), so one read covers them. */
const MAX_TRIP_IDEAS = 50;

/** The newest idea linked to each issue of a trip, from one read of the trip's ideas. */
async function latestIdeaByIssue(ctx: QueryCtx, tripId: Id<'trips'>) {
  const proposals = await ctx.db
    .query('tripProposals')
    .withIndex('by_sourceTripId_and_updatedAt', (query) => query.eq('sourceTripId', tripId))
    .take(MAX_TRIP_IDEAS + 1);
  if (proposals.length > MAX_TRIP_IDEAS) {
    throw new ConvexError(`Trips support up to ${MAX_TRIP_IDEAS} ideas`);
  }
  const latest = new Map<Id<'tripIssues'>, Doc<'tripProposals'>>();
  for (const proposal of proposals) {
    const current = proposal.issueId ? latest.get(proposal.issueId) : undefined;
    if (proposal.issueId && (!current || proposal._creationTime > current._creationTime)) {
      latest.set(proposal.issueId, proposal);
    }
  }
  return latest;
}

function presentListItem(
  issue: ConditionedIssue,
  viewer: Viewer,
  facts: RuleFacts,
  idea: ReturnType<typeof presentIdea>
) {
  return {
    assignee: issue.assignee ? presentAssignee(issue.assignee) : null,
    author: issue.author,
    body: issue.body,
    canAssign: canAssignIssue(viewer),
    canManage: canManageIssue(issue, viewer),
    closedAt: issue.closedAt ?? null,
    condition: presentCondition(issue.condition, facts),
    dueAt: issue.dueAt ?? null,
    id: issue._id,
    shortId: issue.shortId,
    idea,
    labels: issue.labels,
    rank: rankOf(issue),
    status: issue.status,
    title: issue.title,
    updatedAt: issue.updatedAt
  };
}

export async function list(ctx: QueryCtx, tripId: Id<'trips'>) {
  const trip = await loadTripContext(ctx, tripId);
  const viewer = viewerOf(trip);
  const issues = await conditionedIssuesOf(ctx, tripId);
  const [facts, ideas] = await Promise.all([
    loadConditionFacts(trip, issues),
    latestIdeaByIssue(ctx, tripId)
  ]);
  // Board order (rank, then creation time) lets clients render lanes as they come.
  return issues
    .toSorted(compareByRank)
    .map((issue) => presentListItem(issue, viewer, facts, presentIdea(ideas.get(issue._id))));
}

export async function listWorkspace(ctx: QueryCtx, paginationOpts: PaginationOptions) {
  const workspace = await requireWorkspace(ctx);
  if (
    !Number.isInteger(paginationOpts.numItems) ||
    paginationOpts.numItems < 1 ||
    paginationOpts.numItems > 25
  ) {
    throw new ConvexError('issue page size must be between 1 and 25');
  }
  const result = await ctx.db
    .query('tripIssues')
    .withIndex('by_organizationId_and_updatedAt', (query) =>
      query.eq('organizationId', workspace.organizationId)
    )
    .order('desc')
    .paginate(paginationOpts);
  // One condition read per issue: at most 25 a page, so this stays cheap. A larger page would
  // want the by-trip batch (`tripConditions`) instead.
  const issues = await Promise.all(result.page.map((issue) => withCondition(ctx, issue)));

  const views = new Map<Id<'trips'>, ReturnType<typeof loadTripView>>();
  const tripViewOf = (tripId: Id<'trips'>) => {
    const cached = views.get(tripId);
    if (cached) return cached;
    const loading = loadTripView(
      ctx,
      workspace,
      tripId,
      issues.filter((issue) => issue.tripId === tripId)
    );
    views.set(tripId, loading);
    return loading;
  };
  const page = await Promise.all(
    issues.map(async (issue) => {
      const [{ facts, trip, viewer }, idea] = await Promise.all([
        tripViewOf(issue.tripId),
        linkedProposal(ctx, issue._id)
      ]);
      return {
        ...presentListItem(issue, viewer, facts, idea),
        tripId: issue.tripId,
        tripName: trip.trip.name
      };
    })
  );
  return { ...result, page };
}

/** What presenting one trip's issues needs: the trip, the viewer's standing, and its facts. */
async function loadTripView(
  ctx: QueryCtx,
  workspace: Workspace,
  tripId: Id<'trips'>,
  issues: Array<ConditionedIssue>
) {
  const trip = await loadTripContext(ctx, tripId, workspace);
  return { facts: await loadConditionFacts(trip, issues), trip, viewer: viewerOf(trip) };
}

export async function get(ctx: QueryCtx, issueId: Id<'tripIssues'>) {
  // Authenticate before reading, so an anonymous caller learns nothing about which ids exist.
  const workspace = await requireWorkspace(ctx);
  const stored = await ctx.db.get('tripIssues', issueId);
  if (!stored || stored.organizationId !== workspace.organizationId) return null;
  const issue = await withCondition(ctx, stored);
  const loaded = await loadTripContext(ctx, issue.tripId, workspace);
  const [comments, idea, facts] = await Promise.all([
    commentsOf(ctx, issueId),
    linkedProposal(ctx, issueId),
    loadConditionFacts(loaded, [issue])
  ]);
  if (comments.length > MAX_COMMENTS + MAX_SYSTEM_COMMENTS) {
    throw new ConvexError(
      `Trip issues support up to ${MAX_COMMENTS + MAX_SYSTEM_COMMENTS} comments`
    );
  }
  const viewer = viewerOf(loaded);
  return {
    ...presentListItem(issue, viewer, facts, idea),
    canComment: canCommentOnIssue(viewer),
    comments: comments.map((comment) => ({
      author: comment.author,
      content: comment.content,
      createdAt: comment._creationTime,
      id: comment._id,
      kind: comment.kind,
      updatedAt: comment.updatedAt
    })),
    tripId: issue.tripId,
    tripName: loaded.trip.name
  };
}
