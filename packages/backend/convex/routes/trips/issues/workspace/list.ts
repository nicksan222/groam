import {
  type PaginationOptions,
  paginationOptsValidator,
  paginationResultValidator
} from 'convex/server';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { TripIssues } from '#convex/modules/travel/issues/index';
import { TripIssueValidators } from '#convex/modules/travel/issues/schema';

export const run = workspaceQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(TripIssueValidators.workspaceListItem),
  handler: (ctx, { paginationOpts }: { paginationOpts: PaginationOptions }) =>
    TripIssues.listWorkspace(ctx, paginationOpts)
});
