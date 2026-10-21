import { v } from 'convex/values';
import { action } from '#convex-generated/server';
import { MediaCommit } from '#convex/modules/media/library/commit';
import {
  saveMediaResultValidator,
  accessOriginValidator
} from '#convex/modules/media/library/validators';

/** Finalize a Convex storage upload into a workspace media record. Requires auth. */
export const run = action({
  args: {
    contentType: v.string(),
    accessOrigin: v.optional(accessOriginValidator),
    name: v.string(),
    storageId: v.id('_storage')
  },
  returns: saveMediaResultValidator,
  handler: (ctx, args) => MediaCommit.saveFromUpload(ctx, args)
});
