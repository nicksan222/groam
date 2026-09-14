import { v } from 'convex/values';
import { Files } from '#convex/modules/media/files/index';
import { TripCoverValidators } from '#convex/modules/travel/covers/schema';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery
} from '#convex-generated/server';

const WIKIPEDIA_API_URL = 'https://en.wikipedia.org/w/api.php';
const WIKIMEDIA_API_URL = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'Groam trip cover service (https://groam.app)';
const MAX_API_JSON_BYTES = 2 * 1024 * 1024;
const MAX_ERROR_BODY_BYTES = 16 * 1024;
const MAX_STOCK_COVER_BYTES = 10 * 1024 * 1024;
const MIN_STOCK_COVER_WIDTH = 900;
const SUPPORTED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const RETRY_DELAYS_MS = [30_000, 2 * 60_000, 10 * 60_000];
const TRUSTED_API_HOSTS = new Set(['en.wikipedia.org', 'commons.wikimedia.org']);

export type StockCoverCandidate = {
  attribution: {
    creator?: string;
    creatorUrl?: string;
    license: string;
    licenseUrl: string;
    sourceName: string;
    sourceUrl: string;
    title: string;
  };
  imageUrl: string;
};

export type WikipediaLeadImage = {
  articleTitle: string;
  articleUrl: string;
  fileTitle: string;
};

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function nonemptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function httpsUrl(value: unknown): string | null {
  const text = nonemptyString(value);
  if (!text || text.length > 2048) return null;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' &&
      url.port === '' &&
      url.username === '' &&
      url.password === ''
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function trustedUrl(value: unknown, hostname: string): string | null {
  const text = httpsUrl(value);
  if (!text) return null;
  const url = new URL(text);
  return url.hostname === hostname ? url.toString() : null;
}

function pageValues(payload: unknown): Record<string, unknown>[] {
  const response = objectValue(payload);
  const query = objectValue(response?.query);
  if (Array.isArray(query?.pages)) {
    return query.pages.flatMap((page) => {
      const value = objectValue(page);
      return value ? [value] : [];
    });
  }
  const pages = objectValue(query?.pages);
  return pages
    ? Object.values(pages).flatMap((page) =>
        objectValue(page) ? [page as Record<string, unknown>] : []
      )
    : [];
}

function rankedPages(payload: unknown) {
  return pageValues(payload)
    .map((page, position) => ({
      page,
      rank: typeof page.index === 'number' && Number.isFinite(page.index) ? page.index : position
    }))
    .sort((left, right) => left.rank - right.rank)
    .map(({ page }) => page);
}

function wikipediaLeadImages(payload: unknown): WikipediaLeadImage[] {
  return rankedPages(payload).flatMap((page): WikipediaLeadImage[] => {
    const articleTitle = nonemptyString(page.title);
    const articleUrl = trustedUrl(page.fullurl, 'en.wikipedia.org');
    const imageName = nonemptyString(page.pageimage);
    if (!articleTitle || !articleUrl || !imageName || imageName.length > 500) return [];
    return [
      {
        articleTitle: articleTitle.slice(0, 240),
        articleUrl,
        fileTitle: imageName.startsWith('File:') ? imageName : `File:${imageName}`
      }
    ];
  });
}

function wikipediaLeadImage(payload: unknown): WikipediaLeadImage | null {
  return wikipediaLeadImages(payload)[0] ?? null;
}

function decodedHtmlText(value: unknown) {
  const text = nonemptyString(value);
  if (!text) return null;
  return text
    .replace(/<[^>]*>/gu, ' ')
    .replace(/&amp;/gu, '&')
    .replace(/&quot;/gu, '"')
    .replace(/&#0*39;/gu, "'")
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/\s+/gu, ' ')
    .trim();
}

function htmlLink(value: unknown) {
  const text = nonemptyString(value);
  const match = text?.match(/\bhref=(?:"([^"]+)"|'([^']+)')/iu);
  const href = match?.[1] ?? match?.[2];
  if (!href) return null;
  return httpsUrl(href.replace(/&amp;/gu, '&'));
}

function metadataValue(metadata: Record<string, unknown>, key: string): string | null {
  return decodedHtmlText(objectValue(metadata[key])?.value);
}

function licenseDetails(metadata: Record<string, unknown>) {
  const label = metadataValue(metadata, 'LicenseShortName');
  if (!label || !/^(?:CC0(?:\s|$)|CC BY(?:-SA)?(?:\s|$)|Public domain)/iu.test(label)) {
    return null;
  }
  const configuredUrl = httpsUrl(objectValue(metadata.LicenseUrl)?.value);
  const normalizedLabel = label.slice(0, 120);
  if (configuredUrl) return { label: normalizedLabel, url: configuredUrl };
  if (/^CC0/iu.test(label)) {
    return { label: normalizedLabel, url: 'https://creativecommons.org/publicdomain/zero/1.0/' };
  }
  if (/^Public domain/iu.test(label)) {
    return { label: normalizedLabel, url: 'https://creativecommons.org/publicdomain/mark/1.0/' };
  }
  const match = label.match(/^CC BY(-SA)?\s+(\d+(?:\.\d+)?)/iu);
  if (!match) return null;
  return {
    label: normalizedLabel,
    url: `https://creativecommons.org/licenses/by${match[1] ? '-sa' : ''}/${match[2]}/`
  };
}

function imageTitle(
  metadata: Record<string, unknown>,
  pageTitle: string | null,
  fallbackTitle: string
) {
  const title =
    metadataValue(metadata, 'ObjectName') ??
    metadataValue(metadata, 'ImageDescription') ??
    pageTitle?.replace(/^File:/u, '').replace(/_/gu, ' ') ??
    fallbackTitle;
  return title
    .replace(/\.(?:jpe?g|png|webp)$/iu, '')
    .trim()
    .slice(0, 240);
}

type WikimediaImageData = {
  excludedSourceUrl?: string;
  imageUrl: string | null;
  imageWidth: number;
  license: { label: string; url: string } | null;
  mime: string | null | undefined;
  sourceUrl: string | null;
};

type EligibleWikimediaImage = WikimediaImageData & {
  imageUrl: string;
  license: { label: string; url: string };
  mime: string;
  sourceUrl: string;
};

function isEligibleWikimediaImage(data: WikimediaImageData): data is EligibleWikimediaImage {
  return Boolean(
    data.imageUrl &&
      data.sourceUrl &&
      data.sourceUrl !== data.excludedSourceUrl &&
      data.license &&
      data.mime &&
      SUPPORTED_CONTENT_TYPES.has(data.mime) &&
      Number.isFinite(data.imageWidth) &&
      data.imageWidth >= MIN_STOCK_COVER_WIDTH
  );
}

function wikimediaCoverCandidate(
  page: Record<string, unknown>,
  fallbackTitle: string,
  excludedSourceUrl?: string
): StockCoverCandidate | null {
  const imageInfo = Array.isArray(page.imageinfo) ? objectValue(page.imageinfo[0]) : null;
  const metadata = objectValue(imageInfo?.extmetadata);
  const thumbnailUrl = trustedUrl(imageInfo?.thumburl, 'upload.wikimedia.org');
  const imageWidth = thumbnailUrl ? imageInfo?.thumbwidth : imageInfo?.width;
  const mime = nonemptyString(imageInfo?.mime)?.toLowerCase();
  const imageUrl = thumbnailUrl ?? trustedUrl(imageInfo?.url, 'upload.wikimedia.org');
  const sourceUrl = trustedUrl(imageInfo?.descriptionurl ?? page.fullurl, 'commons.wikimedia.org');
  const imageData: WikimediaImageData = {
    excludedSourceUrl,
    imageUrl,
    imageWidth: typeof imageWidth === 'number' ? imageWidth : 0,
    license: metadata ? licenseDetails(metadata) : null,
    mime,
    sourceUrl
  };
  if (!isEligibleWikimediaImage(imageData)) return null;

  const artistHtml = objectValue(metadata?.Artist)?.value;
  const creator = decodedHtmlText(artistHtml)?.slice(0, 160);
  const creatorUrl = htmlLink(artistHtml);
  return {
    attribution: {
      ...(creator ? { creator } : {}),
      ...(creatorUrl ? { creatorUrl } : {}),
      license: imageData.license.label,
      licenseUrl: imageData.license.url,
      sourceName: 'Wikimedia Commons',
      sourceUrl: imageData.sourceUrl,
      title: imageTitle(metadata ?? {}, nonemptyString(page.title), fallbackTitle)
    },
    imageUrl: imageData.imageUrl
  };
}

/** Uses Wikimedia's result order; there is no local keyword or location scoring. */
function wikimediaCoverCandidates(
  payload: unknown,
  fallbackTitle: string,
  excludedSourceUrl?: string
): StockCoverCandidate[] {
  return rankedPages(payload).flatMap((page) => {
    const candidate = wikimediaCoverCandidate(page, fallbackTitle, excludedSourceUrl);
    return candidate ? [candidate] : [];
  });
}

async function readBoundedBody(
  response: Response,
  maximumBytes: number,
  service: string
): Promise<Uint8Array> {
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    await response.body?.cancel();
    throw new Error(`${service} response was too large`);
  }
  if (!response.body) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  const reader = response.body.getReader();
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    byteLength += result.value.byteLength;
    if (byteLength > maximumBytes) {
      await reader.cancel();
      throw new Error(`${service} response was too large`);
    }
    chunks.push(result.value);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function readBoundedText(response: Response, maximumBytes: number, service: string) {
  return new TextDecoder().decode(await readBoundedBody(response, maximumBytes, service));
}

async function fetchJson(url: URL, service: string, timeoutMs = 12_000): Promise<unknown> {
  if (
    url.protocol !== 'https:' ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== '' ||
    !TRUSTED_API_HOSTS.has(url.hostname)
  ) {
    throw new Error(`${service} URL was not trusted`);
  }
  let response: Response;
  try {
    // fallow-ignore-next-line security-sink -- https, empty port, no userinfo, and TRUSTED_API_HOSTS are checked above
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT
      },
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : 'network request failed';
    throw new Error(`${service} is unavailable (${detail})`);
  }
  if (!response.ok) {
    const detail = (await readBoundedText(response, MAX_ERROR_BODY_BYTES, service))
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, 120);
    throw new Error(`${service} returned ${response.status}${detail ? ` (${detail})` : ''}`);
  }
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') throw new Error(`${service} returned invalid content`);
  const text = await readBoundedText(response, MAX_API_JSON_BYTES, service);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${service} returned invalid JSON`);
  }
}

async function searchWikipedia(query: string): Promise<WikipediaLeadImage[]> {
  const url = new URL(WIKIPEDIA_API_URL);
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrlimit', '5');
  url.searchParams.set('gsrnamespace', '0');
  url.searchParams.set('gsrsearch', query);
  url.searchParams.set('inprop', 'url');
  url.searchParams.set('pilicense', 'free');
  url.searchParams.set('piprop', 'name');
  url.searchParams.set('prop', 'pageimages|info');
  url.searchParams.set('redirects', '1');
  return wikipediaLeadImages(await fetchJson(url, 'Wikipedia search'));
}

function wikimediaImageInfoUrl() {
  const url = new URL(WIKIMEDIA_API_URL);
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  url.searchParams.set('iiprop', 'url|size|mime|extmetadata');
  url.searchParams.set('iiurlwidth', '2400');
  url.searchParams.set('prop', 'imageinfo');
  return url;
}

async function wikipediaLeadCover(
  lead: WikipediaLeadImage,
  excludedSourceUrl: string | undefined
): Promise<StockCoverCandidate[]> {
  const url = wikimediaImageInfoUrl();
  url.searchParams.set('titles', lead.fileTitle);
  return wikimediaCoverCandidates(
    await fetchJson(url, 'Wikipedia image lookup'),
    lead.articleTitle,
    excludedSourceUrl
  );
}

async function searchWikimediaImages(
  query: string,
  excludedSourceUrl: string | undefined
): Promise<StockCoverCandidate[]> {
  const url = wikimediaImageInfoUrl();
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrlimit', '20');
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('gsrsearch', query);
  return wikimediaCoverCandidates(
    await fetchJson(url, 'Wikimedia image search'),
    query,
    excludedSourceUrl
  );
}

export async function searchWikipediaCover(
  query: string,
  excludedSourceUrl: string | undefined
): Promise<StockCoverCandidate[]> {
  try {
    const leads = await searchWikipedia(query);
    for (const lead of leads) {
      const candidates = await wikipediaLeadCover(lead, excludedSourceUrl);
      if (candidates.length > 0) return candidates;
    }
  } catch (error) {
    console.warn('Wikipedia lead image lookup failed; using Wikimedia image search', error);
  }
  return await searchWikimediaImages(query, excludedSourceUrl);
}

function hasStockCoverSignature(bytes: Uint8Array, contentType: string): boolean {
  return SUPPORTED_CONTENT_TYPES.has(contentType) && Files.hasValidSignature(bytes, contentType);
}

/** Wikipedia / Wikimedia stock cover lookup used by tests and the generate action. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class StockCover {
  static candidates = wikimediaCoverCandidates;
  static hasSignature = hasStockCoverSignature;
  static leadImage = wikipediaLeadImage;
  static readBoundedBody = readBoundedBody;
}

type StockCoverDownload =
  | { error: string; ok: false }
  | { attribution: StockCoverCandidate['attribution']; blob: Blob; ok: true };

type StockImageResult = { error: string; ok: false } | { blob: Blob; ok: true };

async function stockImageHttpError(response: Response): Promise<{ error: string; ok: false }> {
  const detail = (await readBoundedText(response, MAX_ERROR_BODY_BYTES, 'Wikimedia image download'))
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 120);
  return { error: `HTTP ${response.status}${detail ? ` (${detail})` : ''}`, ok: false };
}

async function readStockImage(response: Response): Promise<StockImageResult> {
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (!contentType || !SUPPORTED_CONTENT_TYPES.has(contentType)) {
    return { error: `unsupported content type ${contentType ?? 'missing'}`, ok: false };
  }
  const imageBytes = await readBoundedBody(
    response,
    MAX_STOCK_COVER_BYTES,
    'Wikimedia image download'
  );
  if (imageBytes.byteLength === 0) return { error: 'image response was empty', ok: false };
  if (!hasStockCoverSignature(imageBytes, contentType)) {
    return { error: 'image contents did not match its content type', ok: false };
  }
  const buffer = new ArrayBuffer(imageBytes.byteLength);
  new Uint8Array(buffer).set(imageBytes);
  return { blob: new Blob([buffer], { type: contentType }), ok: true };
}

async function downloadStockCandidate(candidate: StockCoverCandidate): Promise<StockCoverDownload> {
  try {
    const imageUrl = trustedUrl(candidate.imageUrl, 'upload.wikimedia.org');
    if (!imageUrl) return { error: 'image URL was not trusted', ok: false };
    const response = await fetch(imageUrl, {
      headers: {
        Accept: 'image/jpeg,image/png,image/webp',
        'User-Agent': USER_AGENT
      },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) return await stockImageHttpError(response);
    const image = await readStockImage(response);
    return image.ok
      ? { attribution: candidate.attribution, blob: image.blob, ok: true }
      : { error: image.error, ok: false };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'image request failed',
      ok: false
    };
  }
}

export async function downloadStockCover(candidates: StockCoverCandidate[]) {
  const failures: string[] = [];
  for (const candidate of candidates.slice(0, 8)) {
    const result = await downloadStockCandidate(candidate);
    if (result.ok) return result;
    failures.push(result.error);
  }
  throw new Error(
    `No downloadable Wikipedia location image was found: ${failures.join('; ') || 'no results'}`
  );
}

async function deleteTemporaryCover(ctx: ActionCtx, storageId: Id<'_storage'>) {
  try {
    await ctx.storage.delete(storageId);
  } catch (error) {
    console.warn('Unable to clean up a temporary trip cover', error);
  }
}

function isAutoManagedCover(trip: {
  cover?: { asset?: { source: 'stock' | 'upload' }; generation: number; status: string };
}) {
  return trip.cover?.asset?.source !== 'upload';
}

export const request = internalQuery({
  args: { generation: v.number(), tripId: v.id('trips') },
  returns: v.union(
    v.object({
      excludedSourceUrl: v.union(v.string(), v.null()),
      query: v.string()
    }),
    v.null()
  ),
  handler: async (ctx, { generation, tripId }) => {
    const [trip, destination] = await Promise.all([
      ctx.db.get('trips', tripId),
      ctx.db
        .query('tripDestinations')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
        .first()
    ]);
    if (
      !trip ||
      !destination ||
      trip.cover?.generation !== generation ||
      trip.cover.status !== 'pending' ||
      !isAutoManagedCover(trip)
    ) {
      return null;
    }
    return {
      excludedSourceUrl:
        trip.cover.asset?.source === 'stock' ? trip.cover.asset.attribution.sourceUrl : null,
      query: destination.name
    };
  }
});

export const commit = internalMutation({
  args: {
    attribution: TripCoverValidators.attribution,
    generation: v.number(),
    storageId: v.id('_storage'),
    tripId: v.id('trips')
  },
  returns: v.boolean(),
  handler: async (ctx, { attribution, generation, storageId, tripId }) => {
    const [trip, destination] = await Promise.all([
      ctx.db.get('trips', tripId),
      ctx.db
        .query('tripDestinations')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
        .first()
    ]);
    if (
      !trip ||
      !destination ||
      trip.cover?.generation !== generation ||
      trip.cover.status !== 'pending' ||
      !isAutoManagedCover(trip)
    ) {
      return false;
    }

    await ctx.db.patch('trips', tripId, {
      cover: {
        asset: { attribution, source: 'stock', storageId },
        generation,
        status: 'ready'
      }
    });
    return true;
  }
});

export const markFailed = internalMutation({
  args: { generation: v.number(), tripId: v.id('trips') },
  returns: v.null(),
  handler: async (ctx, { generation, tripId }) => {
    const [trip, destination] = await Promise.all([
      ctx.db.get('trips', tripId),
      ctx.db
        .query('tripDestinations')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
        .first()
    ]);
    if (
      trip &&
      trip.cover?.generation === generation &&
      trip.cover.status === 'pending' &&
      isAutoManagedCover(trip)
    ) {
      const existingAsset = trip.cover.asset;
      await ctx.db.patch('trips', tripId, {
        cover: destination
          ? existingAsset?.source === 'stock'
            ? { asset: existingAsset, generation, status: 'ready' }
            : { generation, status: 'failed' }
          : undefined
      });
    }
    return null;
  }
});

export const generate = internalAction({
  args: { attempt: v.number(), generation: v.number(), tripId: v.id('trips') },
  returns: v.null(),
  handler: async (ctx, args) => {
    let storedId: Id<'_storage'> | undefined;
    try {
      const pending: { excludedSourceUrl: string | null; query: string } | null =
        await ctx.runQuery(internal.modules.travel.covers.stock.request, {
          generation: args.generation,
          tripId: args.tripId
        });
      if (!pending) return null;

      const candidates = await searchWikipediaCover(
        pending.query,
        pending.excludedSourceUrl ?? undefined
      );
      const downloaded = await downloadStockCover(candidates);
      storedId = await ctx.storage.store(downloaded.blob);
      const committed: boolean = await ctx.runMutation(
        internal.modules.travel.covers.stock.commit,
        {
          attribution: downloaded.attribution,
          generation: args.generation,
          storageId: storedId,
          tripId: args.tripId
        }
      );
      if (!committed) await deleteTemporaryCover(ctx, storedId);
    } catch (error: unknown) {
      if (storedId) await deleteTemporaryCover(ctx, storedId);
      const retryDelay = RETRY_DELAYS_MS[args.attempt];
      if (retryDelay !== undefined) {
        await ctx.scheduler.runAfter(retryDelay, internal.modules.travel.covers.stock.generate, {
          ...args,
          attempt: args.attempt + 1
        });
      } else {
        console.warn('Unable to generate a Wikipedia trip cover', error);
        await ctx.runMutation(internal.modules.travel.covers.stock.markFailed, {
          generation: args.generation,
          tripId: args.tripId
        });
      }
    }
    return null;
  }
});
