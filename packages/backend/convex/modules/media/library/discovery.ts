import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import type { Workspace } from '#convex/modules/auth/workspace';
import { MediaAccess, MEDIA_ORIGIN_PAGE } from '#convex/modules/media/access';
import type { AccessOrigin, ListedMedia } from '#convex/modules/media/library/validators';

type Position = {
  organizationId: string;
  userId: string;
  phase: 'library' | 'pins' | 'messages';
  mediaId: Id<'media'> | null;
  outerCursor: string | null;
  originCursor: string | null;
  doneAfterMedia: boolean;
};
export type DiscoveryResult = { items: ListedMedia[]; cursor: string | null; done: boolean };
const PREFIX = 'media-discovery-v1:';
const MAX_CURSOR = 8192;

function encode(position: Position): string {
  return PREFIX + JSON.stringify(position);
}
function decode(ctx: QueryCtx, workspace: Workspace, cursor: string): Position {
  const invalid = () => new ConvexError('Invalid media discovery cursor');
  if (cursor.length > MAX_CURSOR || !cursor.startsWith(PREFIX)) throw invalid();
  let value: unknown;
  try {
    value = JSON.parse(cursor.slice(PREFIX.length));
  } catch {
    throw invalid();
  }
  if (!value || typeof value !== 'object') throw invalid();
  const row = value as Record<string, unknown>;
  if (
    row.organizationId !== workspace.organizationId ||
    row.userId !== workspace.userId ||
    !['library', 'pins', 'messages'].includes(String(row.phase)) ||
    typeof row.doneAfterMedia !== 'boolean' ||
    !(row.outerCursor === null || typeof row.outerCursor === 'string') ||
    !(row.originCursor === null || typeof row.originCursor === 'string') ||
    !(row.mediaId === null || typeof row.mediaId === 'string')
  )
    throw invalid();
  const mediaId = typeof row.mediaId === 'string' ? ctx.db.normalizeId('media', row.mediaId) : null;
  if ((row.phase !== 'library' && !mediaId) || (row.phase === 'library' && row.mediaId !== null))
    throw invalid();
  return {
    organizationId: workspace.organizationId,
    userId: workspace.userId,
    phase: row.phase as Position['phase'],
    mediaId,
    outerCursor: row.outerCursor,
    originCursor: row.originCursor,
    doneAfterMedia: row.doneAfterMedia
  };
}

export async function presentMedia(
  ctx: QueryCtx,
  media: Doc<'media'>,
  origin?: AccessOrigin
): Promise<ListedMedia> {
  return {
    contentType: media.contentType,
    createdAt: media._creationTime,
    id: media._id,
    name: media.name,
    size: media.size,
    url: await ctx.storage.getUrl(media.storageId),
    ...(media.purpose ? { purpose: media.purpose } : {}),
    ...(origin ? { accessOrigin: origin } : {})
  };
}

function advance(position: Position, items: ListedMedia[] = []): DiscoveryResult {
  if (position.doneAfterMedia) return { items, cursor: null, done: true };
  return {
    items,
    cursor: encode({ ...position, mediaId: null, phase: 'library', originCursor: null }),
    done: false
  };
}

function initialPosition(
  ctx: QueryCtx,
  workspace: Workspace,
  args: { cursor?: string | null; mediaId?: Id<'media'> }
): Position {
  const position: Position = args.cursor
    ? decode(ctx, workspace, args.cursor)
    : {
        organizationId: workspace.organizationId,
        userId: workspace.userId,
        phase: args.mediaId ? 'pins' : 'library',
        mediaId: args.mediaId ?? null,
        outerCursor: null,
        originCursor: null,
        doneAfterMedia: Boolean(args.mediaId)
      };
  if (args.cursor && args.mediaId && position.mediaId !== args.mediaId)
    throw new ConvexError('Invalid media discovery target');
  return position;
}

/** Manual traversal: one native pagination per call; cursors are not usePaginatedQuery journals. */
export async function discoverMedia(
  ctx: QueryCtx,
  workspace: Workspace,
  args: { cursor?: string | null; mediaId?: Id<'media'> }
): Promise<DiscoveryResult> {
  let position = initialPosition(ctx, workspace, args);
  let media: Doc<'media'> | null;
  if (position.phase === 'library') {
    const page = await ctx.db
      .query('media')
      .withIndex('by_organizationId', (q) => q.eq('organizationId', workspace.organizationId))
      .order('desc')
      .paginate({ cursor: position.outerCursor, numItems: 1, maximumRowsRead: 1 });
    media = page.page[0] ?? null;
    if (!media) return { items: [], cursor: null, done: true };
    position = {
      ...position,
      mediaId: media._id,
      outerCursor: page.continueCursor,
      doneAfterMedia: page.isDone
    };
  } else {
    if (!position.mediaId) throw new ConvexError('Invalid media discovery cursor');
    media = await ctx.db.get('media', position.mediaId);
  }
  // A cursor never proves workspace membership or absence of origins.
  if (!media || media.organizationId !== workspace.organizationId) return advance(position);
  const access = new MediaAccess(ctx, workspace);
  const initial = await access.inspect(media._id);
  if (initial.status === 'allowed')
    return advance(position, [await presentMedia(ctx, media, initial.origin)]);
  if (initial.status === 'denied') return advance(position);
  if (position.phase === 'library')
    return {
      items: [],
      cursor: encode({ ...position, phase: 'pins', originCursor: null }),
      done: false
    };
  return scanOrigins(ctx, access, media, position);
}

async function originPage(ctx: QueryCtx, mediaId: Id<'media'>, position: Position) {
  const options = {
    cursor: position.originCursor,
    numItems: MEDIA_ORIGIN_PAGE,
    maximumRowsRead: MEDIA_ORIGIN_PAGE
  };
  if (position.phase === 'pins') {
    const page = await ctx.db
      .query('attachments')
      .withIndex('by_mediaId', (q) => q.eq('mediaId', mediaId))
      .paginate(options);
    return {
      ...page,
      origins: page.page.map((pin): AccessOrigin => ({ kind: 'attachment', id: pin._id }))
    };
  }
  const page = await ctx.db
    .query('discussionMessageMedia')
    .withIndex('by_mediaId', (q) => q.eq('mediaId', mediaId))
    .paginate(options);
  return {
    ...page,
    origins: page.page.map((ref): AccessOrigin => ({ kind: 'message', id: ref.messageId }))
  };
}

async function scanOrigins(
  ctx: QueryCtx,
  access: MediaAccess,
  media: Doc<'media'>,
  position: Position
): Promise<DiscoveryResult> {
  const page = await originPage(ctx, media._id, position);
  for (const origin of page.origins) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- One bounded batch revalidates exact media binding and current entitlement before issuing a URL.
    if (await access.fromOrigin(media._id, origin))
      return advance(position, [await presentMedia(ctx, media, origin)]);
  }
  if (position.phase === 'messages' && page.isDone) return advance(position);
  return {
    items: [],
    cursor: encode({
      ...position,
      phase: page.isDone ? 'messages' : position.phase,
      originCursor: page.isDone ? null : page.continueCursor
    }),
    done: false
  };
}
