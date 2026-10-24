import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { TripIssues } from '#convex/modules/travel/issues/index';
import { TripIssueValidators } from '#convex/modules/travel/issues/schema';

export const run = workspaceMutation({
  args: {
    assignee: v.union(TripIssueValidators.assignee, v.null()),
    issueId: v.id('tripIssues')
  },
  returns: v.union(v.id('agentRuns'), v.null()),
  handler: (ctx, { assignee, issueId }) => TripIssues.setAssignee(ctx, issueId, assignee)
});
