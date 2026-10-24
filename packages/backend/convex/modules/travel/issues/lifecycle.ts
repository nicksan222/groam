import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { appendSystemComment } from '#convex/modules/travel/issues/comments';
import {
  checkedConditionMet,
  conditionOf,
  isCheckedCondition
} from '#convex/modules/travel/issues/condition';
import { issueEventMessage } from '#convex/modules/travel/issues/events';
import { loadConditionFacts } from '#convex/modules/travel/issues/facts';
import {
  actorOf,
  canManageIssue,
  viewerOf,
  writableIssueWithTrip
} from '#convex/modules/travel/issues/guard';
import { ruleLabel, ruleRefusal } from '#convex/modules/travel/issues/rules/index';
import { isResolved, type TripIssueStatus } from '#convex/modules/travel/issues/status';
import type { TripCtx } from '#convex/modules/travel/trips/ctx';

/**
 * A checked-condition issue is closed exactly when its condition holds, so a person can neither
 * resolve it while unmet nor make it active again while met. A person's own rule can always be
 * marked won't do, which the system then leaves alone; a starter check cannot, since every trip
 * needs it settled.
 */
async function assertCheckedConditionAllows(
  trip: TripCtx,
  issue: Doc<'tripIssues'>,
  status: TripIssueStatus
): Promise<void> {
  if (issue.status === status) return;
  const condition = await conditionOf(trip, issue._id);
  if (!isCheckedCondition(condition)) return;
  const discarding = status === 'wont_do';
  if (discarding && !condition.starter) return;
  const met = checkedConditionMet(condition, await loadConditionFacts(trip, [{ condition }]));
  // Moving to a resolved status is right exactly when the condition holds. A starter cannot be
  // discarded, so a move to won't do is refused whether or not it holds.
  const agreesWithCondition = !discarding && isResolved(status) === met;
  if (agreesWithCondition) return;
  throw new ConvexError(ruleRefusal(ruleLabel(condition.rule), met));
}

/** Moving between closed and wont_do keeps the moment the issue was first resolved. */
function nextClosedAt(
  from: TripIssueStatus,
  to: TripIssueStatus,
  current: number | undefined,
  now: number
): number | undefined {
  if (!isResolved(to)) return undefined;
  return isResolved(from) ? current : now;
}

/**
 * The one write path for an issue's status. Only an actual status change leaves a system comment
 * and bumps `updatedAt`.
 */
export async function setStatus(
  ctx: MutationCtx,
  issueId: Id<'tripIssues'>,
  status: TripIssueStatus
): Promise<null> {
  const { issue, trip } = await writableIssueWithTrip(ctx, issueId);
  if (!canManageIssue(issue, viewerOf(trip))) {
    throw new ConvexError('Only the issue author or an organizer can change its status');
  }
  if (issue.status === status) return null;
  await assertCheckedConditionAllows(trip, issue, status);
  const now = Date.now();
  await ctx.db.patch('tripIssues', issueId, {
    closedAt: nextClosedAt(issue.status, status, issue.closedAt, now),
    status,
    updatedAt: now
  });
  const actor = actorOf(trip);
  await appendSystemComment(
    ctx,
    issueId,
    actor,
    issueEventMessage(actor.name, { kind: 'status', status })
  );
  await AgentWaits.signal(ctx, { kind: 'issue', refId: issueId });
  return null;
}

/** Closes an unresolved issue as done after its idea merged. */
export async function closeAfterMerge(
  ctx: MutationCtx,
  issue: Doc<'tripIssues'>,
  merge: { actor: { name: string; userId: string }; ideaTitle: string; timestamp: number }
): Promise<void> {
  const { actor, ideaTitle, timestamp } = merge;
  // A checked condition decides for itself whether the merge settled the issue.
  if (isResolved(issue.status) || isCheckedCondition(await conditionOf(ctx, issue._id))) return;
  await ctx.db.patch('tripIssues', issue._id, {
    closedAt: timestamp,
    status: 'closed',
    updatedAt: timestamp
  });
  await appendSystemComment(
    ctx,
    issue._id,
    actor,
    issueEventMessage(actor.name, { idea: ideaTitle, kind: 'closed_by_idea' })
  );
  await AgentWaits.signal(ctx, { kind: 'issue', refId: issue._id });
}
