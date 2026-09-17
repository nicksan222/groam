import { ConvexError } from 'convex/values';
import {
  assertOrganizationManager,
  requireWorkspace,
  updateOrganizationLogo,
  type Workspace
} from '#convex/modules/auth/workspace';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { Attachments } from '#convex/modules/media/attachments/index';
import { Files } from '#convex/modules/media/files/index';
import type {
  GroupLogoResult,
  ListedMedia,
  SaveMediaResult
} from '#convex/modules/media/library/validators';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

const MAX_NAME_LENGTH = 120;
const MEDIA_LIST_MIN = 1;
const MEDIA_LIST_MAX = 50;

/**
 * Organization file library: upload, list, delete, group logo.
 * Trip pins go through `Attachments`; discussion pins through `Discussions.mediaIsAttached`.
 */
export class Media {
  private constructor(
    private readonly ctx: MutationCtx,
    readonly data: Doc<'media'>,
    private readonly workspace: Workspace
  ) {}

  static async find(ctx: MutationCtx, mediaId: Id<'media'>): Promise<Media> {
    const workspace = await requireWorkspace(ctx);
    const media = await ctx.db.get('media', mediaId);
    if (!media || media.organizationId !== workspace.organizationId) {
      throw new ConvexError('Media not found');
    }
    return new Media(ctx, media, workspace);
  }

  static async generateUploadUrl(ctx: MutationCtx): Promise<string> {
    await requireWorkspace(ctx);
    return await ctx.storage.generateUploadUrl();
  }

  /**
   * Insert a library row after `Files.inspect`. Reuses the row when this user already
   * uploaded the same storage id; rejects files that belong to someone else or a cover.
   */
  static async save(
    ctx: MutationCtx,
    {
      storageId,
      name,
      uploadedContentType,
      signatureValid
    }: {
      storageId: Id<'_storage'>;
      name: string;
      uploadedContentType: string;
      signatureValid: boolean;
    }
  ): Promise<SaveMediaResult> {
    const workspace = await requireWorkspace(ctx);
    const existingResult = await Media.resultForExistingStorage(ctx, workspace, storageId);
    if (existingResult) return existingResult;

    const metadata = await ctx.db.system.get('_storage', storageId);
    if (!metadata) return { error: 'The uploaded file was not found', ok: false };
    const contentType = Files.normalizeContentType(metadata.contentType ?? uploadedContentType);
    const invalidReason = Files.validationError(metadata.size, contentType, signatureValid);
    if (invalidReason) {
      await ctx.storage.delete(storageId);
      return { error: invalidReason, ok: false };
    }

    const mediaId = await ctx.db.insert('media', {
      contentType,
      createdBy: workspace.tokenIdentifier,
      name: Media.normalizeName(name),
      organizationId: workspace.organizationId,
      size: metadata.size,
      storageId
    });
    return { mediaId, ok: true };
  }

  static async deleteOrganizationBatch(
    ctx: MutationCtx,
    organizationId: string,
    limit: number
  ): Promise<boolean> {
    const media = await ctx.db
      .query('media')
      .withIndex('by_organizationId', (query) => query.eq('organizationId', organizationId))
      .take(limit);
    for (const item of media) {
      if (await ctx.db.system.get('_storage', item.storageId)) {
        await ctx.storage.delete(item.storageId);
      }
      await ctx.db.delete('media', item._id);
    }
    return media.length === limit;
  }

  static async list(ctx: QueryCtx, limit: number): Promise<ListedMedia[]> {
    const workspace = await requireWorkspace(ctx);
    if (!Number.isInteger(limit) || limit < MEDIA_LIST_MIN || limit > MEDIA_LIST_MAX) {
      throw new ConvexError(
        `Media list limit must be a whole number between ${MEDIA_LIST_MIN} and ${MEDIA_LIST_MAX}`
      );
    }
    const media = await ctx.db
      .query('media')
      .withIndex('by_organizationId', (query) =>
        query.eq('organizationId', workspace.organizationId)
      )
      .order('desc')
      .take(limit);

    return await Promise.all(
      media.map(async (item) => ({
        contentType: item.contentType,
        createdAt: item._creationTime,
        id: item._id,
        name: item.name,
        ...(item.purpose ? { purpose: item.purpose } : {}),
        size: item.size,
        url: await ctx.storage.getUrl(item.storageId)
      }))
    );
  }

  static async clearGroupLogo(ctx: MutationCtx): Promise<null> {
    const workspace = await requireWorkspace(ctx);
    assertOrganizationManager(workspace);
    await updateOrganizationLogo(ctx, workspace, null);

    const currentLogo = await Media.findGroupLogo(ctx, workspace.organizationId);
    if (currentLogo) await ctx.db.patch('media', currentLogo._id, { purpose: undefined });
    return null;
  }

  async delete(): Promise<null> {
    if (this.data.purpose === 'groupLogo') {
      throw new ConvexError('Remove or replace the group logo before deleting this media');
    }
    if (await Attachments.mediaIsAttached(this.ctx, this.data._id)) {
      throw new ConvexError('Remove this file from its trip before deleting it');
    }
    if (await Discussions.mediaIsAttached(this.ctx, this.data._id)) {
      throw new ConvexError('Remove this file from its chat before deleting it');
    }

    await this.ctx.storage.delete(this.data.storageId);
    await this.ctx.db.delete('media', this.data._id);
    return null;
  }

  async setAsGroupLogo(): Promise<GroupLogoResult> {
    assertOrganizationManager(this.workspace);
    if (!Files.isImage(this.data.contentType)) {
      throw new ConvexError('Group logo must be an image');
    }

    const url = await this.ctx.storage.getUrl(this.data.storageId);
    if (!url) throw new ConvexError('Group logo image was not found');
    await updateOrganizationLogo(this.ctx, this.workspace, url);

    const previousLogo = await Media.findGroupLogo(this.ctx, this.workspace.organizationId);
    if (previousLogo && previousLogo._id !== this.data._id) {
      await this.ctx.db.patch('media', previousLogo._id, { purpose: undefined });
    }
    if (this.data.purpose !== 'groupLogo') {
      await this.ctx.db.patch('media', this.data._id, { purpose: 'groupLogo' });
    }

    return { mediaId: this.data._id, url };
  }

  private static async findGroupLogo(ctx: MutationCtx, organizationId: string) {
    return await ctx.db
      .query('media')
      .withIndex('by_organizationId_and_purpose', (query) =>
        query.eq('organizationId', organizationId).eq('purpose', 'groupLogo')
      )
      .unique();
  }

  private static async resultForExistingStorage(
    ctx: MutationCtx,
    workspace: Workspace,
    storageId: Id<'_storage'>
  ): Promise<SaveMediaResult | null> {
    const [existing, existingCover] = await Promise.all([
      ctx.db
        .query('media')
        .withIndex('by_storageId', (query) => query.eq('storageId', storageId))
        .unique(),
      ctx.db
        .query('trips')
        .withIndex('by_cover_asset_storageId', (query) =>
          query.eq('cover.asset.storageId', storageId)
        )
        .unique()
    ]);
    if (existing) {
      const reusable =
        existing.organizationId === workspace.organizationId &&
        existing.createdBy === workspace.tokenIdentifier;
      return reusable
        ? { mediaId: existing._id, ok: true }
        : { error: 'The uploaded file is not available', ok: false };
    }
    if (existingCover) {
      return { error: 'The uploaded file is already used as a trip cover', ok: false };
    }
    return null;
  }

  private static normalizeName(name: string): string {
    const normalized = name.trim();
    return (normalized || 'Untitled upload').slice(0, MAX_NAME_LENGTH);
  }
}
