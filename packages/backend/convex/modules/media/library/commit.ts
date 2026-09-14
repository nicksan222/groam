import { ConvexError, v } from 'convex/values';
import { Files } from '#convex/modules/media/files/index';
import { Media } from '#convex/modules/media/library/index';
import {
  type SaveMediaResult,
  saveMediaResultValidator
} from '#convex/modules/media/library/validators';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { type ActionCtx, internalMutation } from '#convex-generated/server';

/**
 * Action-side upload finish. Reads magic bytes in the action, then inserts the
 * library row in `save` (mutations cannot stream storage the same way).
 */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class MediaCommit {
  static async saveFromUpload(
    ctx: ActionCtx,
    args: { contentType: string; name: string; storageId: Id<'_storage'> }
  ): Promise<SaveMediaResult> {
    if (!(await ctx.auth.getUserIdentity())) throw new ConvexError('Not authenticated');
    const file = await Files.inspect(ctx, args.storageId, args.contentType);
    const saved: SaveMediaResult = await ctx.runMutation(
      internal.modules.media.library.commit.save,
      {
        contentType: file.contentType,
        name: args.name,
        signatureValid: file.signatureValid,
        storageId: args.storageId
      }
    );
    return saved;
  }
}

export const save = internalMutation({
  args: {
    contentType: v.string(),
    name: v.string(),
    signatureValid: v.boolean(),
    storageId: v.id('_storage')
  },
  returns: saveMediaResultValidator,
  handler: (ctx, { contentType, name, signatureValid, storageId }) =>
    Media.save(ctx, storageId, name, contentType, signatureValid)
});
