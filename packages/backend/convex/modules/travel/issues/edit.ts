import { ConvexError } from 'convex/values';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import {
  appendComment,
  appendSystemComment,
  MAX_COMMENT_LENGTH,
  MAX_COMMENTS
} from '#convex/modules/travel/issues/comments';
import { conditionLabel, writeCondition } from '#convex/modules/travel/issues/condition';
import { personCondition } from '#convex/modules/travel/issues/create';
import { issueEventMessage } from '#convex/modules/travel/issues/events';
import {
  actorOf,
  boundedText,
  isAuthorOrAdmin,
  writableIssueWithTrip
} from '#convex/modules/travel/issues/guard';
import type { IssueRule } from '#convex/modules/travel/issues/rules/index';
import { syncTripConditions } from '#convex/modules/travel/issues/sync';

/** Any trip member may comment; an archived trip is read-only. */
export async function addComment(
  ctx: MutationCtx,
  issueId: Id<'tripIssues'>,
  contentInput: string
): Promise<Id<'tripIssueComments'>> {
  const { trip } = await writableIssueWithTrip(ctx, issueId);
  const commentId = await appendComment(ctx, issueId, 'comment', {
    author: actorOf(trip),
    content: boundedText(contentInput, MAX_COMMENT_LENGTH, 'Issue comment')
  });
  if (commentId === null) {
    throw new ConvexError(`Trip issues support up to ${MAX_COMMENTS} comments`);
  }
  await ctx.db.patch('tripIssues', issueId, { updatedAt: Date.now() });
  return commentId;
}

export async function setDueAt(
  ctx: MutationCtx,
  issueId: Id<'tripIssues'>,
  dueAt: number | null
): Promise<null> {
  const { issue, trip } = await writableIssueWithTrip(ctx, issueId);
  if (!isAuthorOrAdmin(issue, trip)) {
    throw new ConvexError('Only organizers or the author can set a decide-by date');
  }
  if (dueAt !== null && (!Number.isFinite(dueAt) || dueAt < 0)) {
    throw new ConvexError('Decide-by date is invalid');
  }
  await ctx.db.patch('tripIssues', issueId, {
    dueAt: dueAt ?? undefined,
    updatedAt: Date.now()
  });
  return null;
}

/**
 * Sets, replaces, or clears (neither given) a person's "done when". Editing a starter decision
 * makes it that person's rule, so it loses the starter lock. A new rule is checked at once, so the
 * issue closes or reopens to match the trip; dropping a rule leaves the status where it is.
 */
export async function setCondition(
  ctx: MutationCtx,
  issueId: Id<'tripIssues'>,
  input: { doneWhen?: string; rule?: IssueRule }
): Promise<null> {
  const { issue, trip } = await writableIssueWithTrip(ctx, issueId);
  if (!isAuthorOrAdmin(issue, trip)) {
    throw new ConvexError('Only organizers or the author can change when an issue is done');
  }
  const condition = personCondition(input);
  await writeCondition(ctx, issue, condition);
  await ctx.db.patch('tripIssues', issueId, { updatedAt: Date.now() });
  const actor = actorOf(trip);
  await appendSystemComment(
    ctx,
    issueId,
    actor,
    issueEventMessage(
      actor.name,
      condition
        ? { kind: 'condition_set', label: conditionLabel(condition) }
        : { kind: 'condition_removed' }
    )
  );
  if (condition?.kind === 'rule') await syncTripConditions(trip);
  return null;
}
