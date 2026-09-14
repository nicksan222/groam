import { ConvexError } from 'convex/values';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import {
  assertMutable,
  loadTripContext,
  type MutableTripCtx,
  patchTrip,
  recordActivity
} from '#convex/modules/travel/trips/ctx';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';

const MAX_COVER_SIZE = 25 * 1024 * 1024;
const SUPPORTED_COVER_CONTENT_TYPES = new Set([
  'image/avif',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

export class TripCover {
  private constructor(
    private readonly ctx: MutationCtx,
    private readonly trip: MutableTripCtx
  ) {}

  static async find(ctx: MutationCtx, tripId: Id<'trips'>): Promise<TripCover> {
    return new TripCover(ctx, await loadTripContext(ctx, tripId));
  }

  static from(ctx: MutationCtx, trip: MutableTripCtx): TripCover {
    return new TripCover(ctx, trip);
  }

  static async generateUploadUrl(ctx: MutationCtx): Promise<string> {
    await requireWorkspace(ctx);
    return await ctx.storage.generateUploadUrl();
  }

  refresh(discardExisting = false) {
    if (this.source() === 'upload') return null;
    const generation = this.generation() + 1;
    const cover = this.trip.trip.cover;
    const existingAsset = !discardExisting && cover && 'asset' in cover ? cover.asset : undefined;
    return {
      cover: {
        ...(existingAsset?.source === 'stock' ? { asset: existingAsset } : {}),
        generation,
        status: 'pending' as const
      },
      generation
    };
  }

  clearAutomatic() {
    if (this.source() === 'upload') return null;
    return { cover: undefined, generation: this.generation() + 1 };
  }

  async set(
    storageId: Id<'_storage'>,
    contentType: string | undefined,
    signatureValid: boolean
  ): Promise<null> {
    assertMutable(this.trip);
    if (this.source() === 'upload' && this.storageId() === storageId) return null;
    await TripCover.validate(this.ctx, storageId, contentType, signatureValid);

    await patchTrip(this.trip, {
      cover: {
        asset: { source: 'upload', storageId },
        generation: this.generation() + 1,
        status: 'ready'
      },
      updatedAt: Date.now()
    });
    await recordActivity(
      this.trip,
      'cover_updated',
      `${this.trip.workspace.viewerName} replaced the trip cover`
    );
    return null;
  }

  async retry(): Promise<null> {
    assertMutable(this.trip);
    if (this.source() === 'upload') {
      throw new ConvexError('Uploaded covers can only be replaced with another upload');
    }
    if (!(await TripCover.hasDestination(this.ctx, this.trip.trip._id))) {
      throw new ConvexError('Add a destination before generating a trip cover');
    }
    if (this.trip.trip.cover?.status === 'pending') return null;

    const refresh = this.refresh();
    if (!refresh) throw new ConvexError('This trip cover is not managed automatically');
    await patchTrip(this.trip, { cover: refresh.cover, updatedAt: Date.now() });
    await recordActivity(
      this.trip,
      'cover_updated',
      `${this.trip.workspace.viewerName} requested a new trip cover`
    );
    await this.schedule(refresh.generation);
    return null;
  }

  async schedule(generation: number, delayMs = 0): Promise<void> {
    await TripCover.schedule(this.ctx, this.trip.trip._id, generation, delayMs);
  }

  static async hasDestination(ctx: MutationCtx, tripId: Id<'trips'>): Promise<boolean> {
    return (
      (await ctx.db
        .query('tripDestinations')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
        .first()) !== null
    );
  }

  static async validate(
    ctx: MutationCtx,
    storageId: Id<'_storage'> | undefined,
    uploadedContentType: string | undefined,
    signatureValid: boolean
  ): Promise<void> {
    if (storageId === undefined) return;
    const [metadata, existingTrip, existingMedia] = await Promise.all([
      ctx.db.system.get('_storage', storageId),
      ctx.db
        .query('trips')
        .withIndex('by_cover_asset_storageId', (query) =>
          query.eq('cover.asset.storageId', storageId)
        )
        .unique(),
      ctx.db
        .query('media')
        .withIndex('by_storageId', (query) => query.eq('storageId', storageId))
        .unique()
    ]);
    if (!metadata) throw new ConvexError('cover image was not found');
    const contentType = (metadata.contentType ?? uploadedContentType)
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase();
    if (!contentType || !SUPPORTED_COVER_CONTENT_TYPES.has(contentType)) {
      throw new ConvexError('cover must be a JPEG, PNG, WebP, or AVIF image');
    }
    if (metadata.size > MAX_COVER_SIZE) {
      throw new ConvexError('cover image must be 25 MB or smaller');
    }
    if (!signatureValid) {
      throw new ConvexError('cover contents do not match its image type');
    }
    if (existingTrip || existingMedia) throw new ConvexError('cover image is already in use');
  }

  static async deleteStorage(
    ctx: MutationCtx,
    storageId: Id<'_storage'> | undefined
  ): Promise<void> {
    if (storageId && (await ctx.db.system.get('_storage', storageId))) {
      await ctx.storage.delete(storageId);
    }
  }

  static async schedule(
    ctx: MutationCtx,
    tripId: Id<'trips'>,
    generation: number,
    delayMs = 0
  ): Promise<void> {
    if (!(await TripCover.hasDestination(ctx, tripId))) return;
    await ctx.scheduler.runAfter(delayMs, internal.modules.travel.covers.stock.generate, {
      attempt: 0,
      generation,
      tripId
    });
  }

  static async ensureForTrip(ctx: MutationCtx, tripId: Id<'trips'>): Promise<null> {
    const data = await ctx.db.get('trips', tripId);
    if (!data?.cover && (await TripCover.hasDestination(ctx, tripId))) {
      const trip = await loadTripContext(ctx, tripId);
      const refresh = TripCover.from(ctx, trip).refresh();
      if (refresh) {
        await patchTrip(trip, { cover: refresh.cover, updatedAt: Date.now() });
        await TripCover.schedule(ctx, tripId, refresh.generation);
      }
    }
    return null;
  }

  private generation(): number {
    return this.trip.trip.cover?.generation ?? 0;
  }

  private source(): 'stock' | 'upload' | undefined {
    const cover = this.trip.trip.cover;
    return cover && 'asset' in cover ? cover.asset?.source : undefined;
  }

  private storageId(): Id<'_storage'> | undefined {
    const cover = this.trip.trip.cover;
    return cover && 'asset' in cover ? cover.asset?.storageId : undefined;
  }
}
