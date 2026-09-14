import { v } from 'convex/values';
import { MediaCommit } from '#convex/modules/media/library/commit';
import { saveMediaResultValidator } from '#convex/modules/media/library/validators';
import { action } from '#convex-generated/server';

/** Finalize a Convex storage upload into a workspace media record. Requires auth. */
export const run = action({
  args: {
    contentType: v.string(),
    name: v.string(),
    storageId: v.id('_storage')
  },
  returns: saveMediaResultValidator,
  handler: (ctx, args) => MediaCommit.saveFromUpload(ctx, args)
});
