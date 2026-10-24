import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { MAX_ISSUE_COMMENT_LENGTH } from '#convex/modules/travel/issues/lengths';

export const MAX_COMMENTS = 200;
/** System comments (status and assignment events) have their own cap, apart from human ones. */
export const MAX_SYSTEM_COMMENTS = 200;

export type CommentKind = 'comment' | 'system';

const counters = {
  comment: { field: 'humanCommentCount', maximum: MAX_COMMENTS },
  system: { field: 'systemCommentCount', maximum: MAX_SYSTEM_COMMENTS }
} as const;

/** Both caps are enforced on write, so one bounded read sees every comment. */
export async function commentsOf(ctx: Pick<QueryCtx, 'db'>, issueId: Id<'tripIssues'>) {
  return await ctx.db
    .query('tripIssueComments')
    .withIndex('by_issueId', (query) => query.eq('issueId', issueId))
    .take(MAX_COMMENTS + MAX_SYSTEM_COMMENTS + 1);
}

/** Adds a comment unless the thread is full for its kind; returns null then. */
export async function appendComment(
  ctx: Pick<MutationCtx, 'db'>,
  issueId: Id<'tripIssues'>,
  kind: CommentKind,
  comment: { author: { name: string; userId: string }; content: string }
): Promise<Id<'tripIssueComments'> | null> {
  const issue = await ctx.db.get('tripIssues', issueId);
  if (!issue) return null;
  const { field, maximum } = counters[kind];
  const count = issue[field];
  if (count >= maximum) return null;
  await ctx.db.patch('tripIssues', issueId, { [field]: count + 1 });
  return await ctx.db.insert('tripIssueComments', {
    ...comment,
    issueId,
    kind,
    organizationId: issue.organizationId,
    tripId: issue.tripId,
    updatedAt: Date.now()
  });
}

/**
 * Records an event on the issue's thread; dropped quietly once the system cap is reached. It does
 * not touch the issue's `updatedAt`; every caller has already written the change it describes.
 */
export async function appendSystemComment(
  ctx: Pick<MutationCtx, 'db'>,
  issueId: Id<'tripIssues'>,
  actor: { name: string; userId: string },
  content: string
): Promise<void> {
  await appendComment(ctx, issueId, 'system', {
    author: actor,
    content: content.trim().slice(0, MAX_ISSUE_COMMENT_LENGTH)
  });
}
