import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import { resolveAbout } from '#convex/modules/travel/issues/about';
import { presentAssignee } from '#convex/modules/travel/issues/assignee';
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
import { MAX_ISSUES } from '#convex/modules/travel/issues/limits';
import { loadTripContext } from '#convex/modules/travel/trips/ctx';
import { isIssueYourTurn } from '#convex/modules/travel/turn';

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
  // Newest first; starter issues are inserted last-first, so they read in their intended order.
  return issues
    .toSorted((left, right) => right._creationTime - left._creationTime)
    .map((issue) => presentListItem(issue, viewer, facts, presentIdea(ideas.get(issue._id))));
}

/**
 * The issues of a trip that wait on the viewer, for Home: raw rows only (no conditions, rule
 * facts or ideas), the most recently touched first, never past the per-trip issue cap.
 */
export async function listTurn(ctx: QueryCtx, tripId: Id<'trips'>, viewerUserId: string) {
  const issues = await ctx.db
    .query('tripIssues')
    .withIndex('by_tripId_and_updatedAt', (query) => query.eq('tripId', tripId))
    .order('desc')
    .take(MAX_ISSUES);
  return issues.filter((issue) =>
    isIssueYourTurn({ assignee: issue.assignee ?? null, status: issue.status }, viewerUserId)
  );
}

export async function get(ctx: QueryCtx, issueId: Id<'tripIssues'>) {
  // Authenticate before reading, so an anonymous caller learns nothing about which ids exist.
  const workspace = await requireWorkspace(ctx);
  const stored = await ctx.db.get('tripIssues', issueId);
  if (!stored || stored.organizationId !== workspace.organizationId) return null;
  const issue = await withCondition(ctx, stored);
  const loaded = await loadTripContext(ctx, issue.tripId, workspace);
  const [comments, idea, facts, about] = await Promise.all([
    commentsOf(ctx, issueId),
    linkedProposal(ctx, issueId),
    loadConditionFacts(loaded, [issue]),
    resolveAbout(ctx, issue.subject)
  ]);
  if (comments.length > MAX_COMMENTS + MAX_SYSTEM_COMMENTS) {
    throw new ConvexError(
      `Trip issues support up to ${MAX_COMMENTS + MAX_SYSTEM_COMMENTS} comments`
    );
  }
  const viewer = viewerOf(loaded);
  return {
    ...presentListItem(issue, viewer, facts, idea),
    about,
    subjectMissing: issue.subject !== undefined && about === null,
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
