import type { PaginationOptions, PaginationResult } from 'convex/server';
import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import {
  assertOrganizationManager,
  requireWorkspace,
  updateOrganizationLogo,
  type Workspace
} from '#convex/modules/auth/workspace';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { MediaAccess } from '#convex/modules/media/access';
import { Attachments } from '#convex/modules/media/attachments/index';
import { Files } from '#convex/modules/media/files/index';
import { presentMedia } from '#convex/modules/media/library/discovery';
import type { AccessOrigin } from '#convex/modules/media/library/validators';
import type {
  GroupLogoResult,
  ListedMedia,
  SaveMediaResult
} from '#convex/modules/media/library/validators';

const MAX_NAME_LENGTH = 120;
const MEDIA_LIST_MIN = 1;
const MEDIA_LIST_MAX = 50;
// A file may require 163 indexed reads across its bounded origin windows. Twenty raw
// candidates leave headroom under 4096 ranges, including workspace and URL resolution.
const MEDIA_CANDIDATES = 20;

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

  static async find(ctx: MutationCtx, mediaId: Id<'media'>, origin?: AccessOrigin): Promise<Media> {
    const workspace = await requireWorkspace(ctx);
    const media = await ctx.db.get('media', mediaId);
    if (
      !media ||
      media.organizationId !== workspace.organizationId ||
      !(await new MediaAccess(ctx, workspace).canRead(mediaId, origin))
    ) {
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
      signatureValid,
      accessOrigin
    }: {
      storageId: Id<'_storage'>;
      name: string;
      uploadedContentType: string;
      signatureValid: boolean;
      accessOrigin?: AccessOrigin;
    }
  ): Promise<SaveMediaResult> {
    const workspace = await requireWorkspace(ctx);
    const existingResult = await Media.resultForExistingStorage(
      ctx,
      workspace,
      storageId,
      accessOrigin
    );
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
    await Promise.all(
      media.map(async (item) => {
        if (await ctx.db.system.get('_storage', item.storageId)) {
          await ctx.storage.delete(item.storageId);
        }
        await ctx.db.delete('media', item._id);
      })
    );
    return media.length === limit;
  }

  /** Compatibility reader: only the most recent raw candidate window, never a complete library. */
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
      .take(Math.min(limit, MEDIA_CANDIDATES));

    return Media.visibleRows(ctx, workspace, media);
  }

  /** Preferred library reader: an empty filtered page still retains its continuation cursor. */
  static async page(
    ctx: QueryCtx,
    paginationOpts: PaginationOptions
  ): Promise<PaginationResult<ListedMedia>> {
    const workspace = await requireWorkspace(ctx);
    if (
      !Number.isInteger(paginationOpts.numItems) ||
      paginationOpts.numItems < 1 ||
      paginationOpts.numItems > MEDIA_LIST_MAX
    )
      throw new ConvexError(
        `Media page size must be a whole number between 1 and ${MEDIA_LIST_MAX}`
      );
    const result = await ctx.db
      .query('media')
      .withIndex('by_organizationId', (query) =>
        query.eq('organizationId', workspace.organizationId)
      )
      .order('desc')
      .paginate({
        ...paginationOpts,
        numItems: Math.min(paginationOpts.numItems, MEDIA_CANDIDATES),
        maximumRowsRead: MEDIA_CANDIDATES
      });
    return { ...result, page: await Media.visibleRows(ctx, workspace, result.page) };
  }

  private static async visibleRows(
    ctx: QueryCtx,
    workspace: Workspace,
    media: Doc<'media'>[]
  ): Promise<ListedMedia[]> {
    const access = new MediaAccess(ctx, workspace);
    const visible: ListedMedia[] = [];
    for (const item of media) {
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Bound nested history work to one file at a time.
      const result = await access.inspect(item._id);
      if (result.status === 'unresolved')
        throw new ConvexError({
          code: 'MEDIA_ACCESS_UNRESOLVED',
          message: 'Use media.discover to resolve an access origin'
        });
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Issue URLs only after discovering an actual grant.
      if (result.status === 'allowed') visible.push(await presentMedia(ctx, item, result.origin));
    }
    return visible;
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
    storageId: Id<'_storage'>,
    accessOrigin?: AccessOrigin
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
      if (!Files.supportedContentTypes.has(Files.normalizeContentType(existing.contentType))) {
        return { error: 'Upload a supported image, video, or PDF', ok: false };
      }
      const reusable =
        existing.organizationId === workspace.organizationId &&
        existing.createdBy === workspace.tokenIdentifier &&
        (await new MediaAccess(ctx, workspace).canRead(existing._id, accessOrigin));
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
