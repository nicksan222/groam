import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { TripIssues } from '#convex/modules/travel/issues/index';
import { TripIssueValidators } from '#convex/modules/travel/issues/schema';

export const run = workspaceMutation({
  args: { issueId: v.id('tripIssues'), status: TripIssueValidators.status },
  returns: v.null(),
  handler: (ctx, { issueId, status }) => TripIssues.setStatus(ctx, issueId, status)
});
