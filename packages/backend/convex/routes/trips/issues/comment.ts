import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { TripIssues } from '#convex/modules/travel/issues/index';

export const run = workspaceMutation({
  args: { content: v.string(), issueId: v.id('tripIssues') },
  returns: v.id('tripIssueComments'),
  handler: (ctx, { content, issueId }) => TripIssues.addComment(ctx, issueId, content)
});
