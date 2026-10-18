import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { TripIssues } from '#convex/modules/travel/issues/index';
import { TripIssueValidators } from '#convex/modules/travel/issues/schema';

/**
 * Drops an issue on the board. `beforeIssueId` is the card that sits directly above the dropped
 * one and `afterIssueId` the card directly below, both in the target lane after the drop. Omit
 * both to append to the bottom. The server computes the rank.
 */
export const run = workspaceMutation({
  args: {
    afterIssueId: v.optional(v.id('tripIssues')),
    beforeIssueId: v.optional(v.id('tripIssues')),
    issueId: v.id('tripIssues'),
    status: TripIssueValidators.status
  },
  returns: v.null(),
  handler: (ctx, { afterIssueId, beforeIssueId, issueId, status }) =>
    TripIssues.move(ctx, issueId, status, { above: beforeIssueId, below: afterIssueId })
});
