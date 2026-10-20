import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { Research } from '#convex/modules/discussions/research/index';
import { ResearchValidators } from '#convex/modules/discussions/research/schema';

export const run = workspaceQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(ResearchValidators.workspaceItem),
  handler: (ctx, { paginationOpts }) =>
    Research.pageForWorkspace(ctx, ctx.workspace, paginationOpts)
});
