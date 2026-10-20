import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { query } from '#convex-generated/server';
import { Media } from '#convex/modules/media/library/index';
import { listedMediaValidator } from '#convex/modules/media/library/validators';

export const run = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(listedMediaValidator),
  handler: (ctx, { paginationOpts }) => Media.page(ctx, paginationOpts)
});
