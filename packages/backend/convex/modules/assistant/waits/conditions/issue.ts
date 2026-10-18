import { ConvexError } from 'convex/values';
import type { Doc } from '#convex-generated/dataModel';
import { defineWaitCondition } from '#convex/modules/assistant/waits/conditions/types';
import { isResolved } from '#convex/modules/travel/issues/status';
import { findVisibleTrip } from '#convex/modules/travel/trips/visibility';

function statusText(status: string): string {
  return status.replace('_', ' ');
}

/** Met once the trip issue is closed or marked won't do. */
export const issueCondition = defineWaitCondition({
  judge: (condition, issue: Doc<'tripIssues'> | null) => {
    if (!issue) {
      return {
        met: false,
        progress: null,
        snapshot: {
          issueId: condition.issueId,
          kind: 'issue',
          status: 'deleted',
          title: 'Deleted issue'
        },
        summary: 'The issue was deleted'
      };
    }
    const met = isResolved(issue.status);
    return {
      met,
      progress: met ? 'resolved' : statusText(issue.status),
      snapshot: { issueId: issue._id, kind: 'issue', status: issue.status, title: issue.title },
      summary: `issue '${issue.title}' is ${statusText(issue.status)}`
    };
  },
  kind: 'issue',
  label: async (ctx, condition) => {
    const issue = await ctx.db.get('tripIssues', condition.issueId);
    return issue ? `issue “${issue.title}” to be resolved` : 'a deleted issue';
  },
  load: async (ctx, condition) => await ctx.db.get('tripIssues', condition.issueId),
  refId: (condition) => condition.issueId,
  validate: async (ctx, condition, scope) => {
    const issue = await ctx.db.get('tripIssues', condition.issueId);
    // The run acts for its creator, so it may only watch an issue on a trip they can read.
    if (
      !issue ||
      issue.organizationId !== scope.organizationId ||
      !(await findVisibleTrip(ctx, issue.tripId, scope.viewer))
    ) {
      throw new ConvexError('Issue not found');
    }
    if (scope.tripId && issue.tripId !== scope.tripId) {
      throw new ConvexError('That issue belongs to another trip');
    }
    return { tripId: issue.tripId };
  }
});
