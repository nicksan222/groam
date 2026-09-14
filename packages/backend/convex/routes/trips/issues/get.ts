import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { TripIssues } from '#convex/modules/travel/issues/index';
import { TripIssueValidators } from '#convex/modules/travel/issues/schema';

export const run = workspaceQuery({
  args: { issueId: v.id('tripIssues') },
  returns: v.union(TripIssueValidators.detail, v.null()),
  handler: (ctx, { issueId }) => TripIssues.get(ctx, issueId)
});
