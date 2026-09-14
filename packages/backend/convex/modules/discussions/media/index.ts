import { ConvexError } from 'convex/values';
import type { DiscussionMessageMedia } from '#convex/modules/discussions/threads/schema';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

export type { DiscussionMessageMedia } from '#convex/modules/discussions/threads/schema';

export const MAX_MEDIA_PER_MESSAGE = 5;

export type DiscussionMessageReceipt = {
  _id: Id<'discussionMessages'>;
  mediaIds?: Id<'media'>[];
};

/**
 * Library files attached to a discussion message.
 * `require` throws if any id is missing; `load` skips them so a list cannot 404.
 * Newer receipts store `mediaIds` on the message; older ones only have join rows.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class DiscussionMedia {
  static sameIds(left: Id<'media'>[] | undefined, right: Id<'media'>[]): boolean {
    const normalizedLeft = left ?? [];
    return (
      normalizedLeft.length === right.length &&
      normalizedLeft.every((mediaId, index) => mediaId === right[index])
    );
  }

  /** Last-message / agent-prompt text when the user sent files with no caption. */
  static previewLabel(media: Array<{ contentType: string; name: string }>): string {
    if (media.length === 0) return '';
    if (media.length === 1) {
      const item = media[0];
      if (!item) return 'Sent a file';
      if (item.contentType.startsWith('image/')) return 'Sent a photo';
      if (item.contentType.startsWith('video/')) return 'Sent a video';
      if (item.contentType.startsWith('audio/')) return 'Sent an audio file';
      return `Sent ${item.name}`;
    }
    return `Sent ${media.length} files`;
  }

  static normalizeIds(mediaIds: Id<'media'>[] | undefined): Id<'media'>[] {
    if (mediaIds === undefined || mediaIds.length === 0) return [];
    if (mediaIds.length > MAX_MEDIA_PER_MESSAGE) {
      throw new ConvexError(`Messages can include at most ${MAX_MEDIA_PER_MESSAGE} files`);
    }
    if (new Set(mediaIds).size !== mediaIds.length) {
      throw new ConvexError('Duplicate media attachments are not allowed');
    }
    return mediaIds;
  }

  static async require(
    ctx: MutationCtx | QueryCtx,
    organizationId: string,
    mediaIds: Id<'media'>[]
  ): Promise<DiscussionMessageMedia[]> {
    const resolved: DiscussionMessageMedia[] = [];
    for (const mediaId of mediaIds) {
      const media = await ctx.db.get('media', mediaId);
      if (!media || media.organizationId !== organizationId) {
        throw new ConvexError('Media not found');
      }
      resolved.push({
        contentType: media.contentType,
        id: media._id,
        name: media.name,
        size: media.size,
        url: await ctx.storage.getUrl(media.storageId)
      });
    }
    return resolved;
  }

  static async load(
    ctx: MutationCtx | QueryCtx,
    organizationId: string,
    mediaIds: Id<'media'>[]
  ): Promise<DiscussionMessageMedia[]> {
    if (mediaIds.length === 0) return [];
    const attachments = await Promise.all(
      mediaIds.map(async (mediaId) => {
        const item = await ctx.db.get('media', mediaId);
        if (!item || item.organizationId !== organizationId) return null;
        return {
          contentType: item.contentType,
          id: item._id,
          name: item.name,
          size: item.size,
          url: await ctx.storage.getUrl(item.storageId)
        } satisfies DiscussionMessageMedia;
      })
    );
    return attachments.filter((item) => item !== null);
  }

  static async idsForMessage(
    ctx: MutationCtx | QueryCtx,
    messageId: Id<'discussionMessages'>
  ): Promise<Id<'media'>[]> {
    const refs = await ctx.db
      .query('discussionMessageMedia')
      .withIndex('by_messageId', (query) => query.eq('messageId', messageId))
      .take(MAX_MEDIA_PER_MESSAGE);
    return refs.map((ref) => ref.mediaId);
  }

  static async idsForReceipt(
    ctx: MutationCtx | QueryCtx,
    receipt: DiscussionMessageReceipt
  ): Promise<Id<'media'>[]> {
    return receipt.mediaIds && receipt.mediaIds.length > 0
      ? receipt.mediaIds
      : await DiscussionMedia.idsForMessage(ctx, receipt._id);
  }

  static async deleteRefs(ctx: MutationCtx, messageId: Id<'discussionMessages'>): Promise<void> {
    const refs = await ctx.db
      .query('discussionMessageMedia')
      .withIndex('by_messageId', (query) => query.eq('messageId', messageId))
      .take(MAX_MEDIA_PER_MESSAGE + 1);
    for (const ref of refs) await ctx.db.delete(ref._id);
  }
}
