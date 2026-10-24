import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { TripIssues } from '#convex/modules/travel/issues/index';
import { TripIssueValidators } from '#convex/modules/travel/issues/schema';

/** Sets an issue's "done when": a composed `rule`, free-text `doneWhen`, or neither to clear. */
export const run = workspaceMutation({
  args: {
    doneWhen: v.optional(v.string()),
    issueId: v.id('tripIssues'),
    rule: v.optional(TripIssueValidators.rule)
  },
  returns: v.null(),
  handler: (ctx, { issueId, ...input }) => TripIssues.setCondition(ctx, issueId, input)
});
