import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { TripIssues } from '#convex/modules/travel/issues/index';

export const run = workspaceMutation({
  args: { dueAt: v.union(v.number(), v.null()), issueId: v.id('tripIssues') },
  returns: v.null(),
  handler: (ctx, { dueAt, issueId }) => TripIssues.setDueAt(ctx, issueId, dueAt)
});
