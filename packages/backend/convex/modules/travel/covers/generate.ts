import type { Id } from '#convex-generated/dataModel';
import type { ActionCtx } from '#convex-generated/server';
import type { StockCoverCandidate } from '#convex/modules/travel/covers/wikimedia';
import { downloadStockCover, searchWikipediaCover } from '#convex/modules/travel/covers/wikimedia';

const RETRY_DELAYS_MS = [30_000, 2 * 60_000, 10 * 60_000];

export type PendingCover = { excludedSourceUrl: string | null; query: string };

/** The owner-specific steps; the retry and cleanup flow around them is shared. */
export type StockCoverJob = {
  attempt: number;
  /** Stores the finished photo; false means a newer generation superseded this one. */
  commit: (result: {
    attribution: StockCoverCandidate['attribution'];
    storageId: Id<'_storage'>;
  }) => Promise<boolean>;
  /** Called after the last retry so the owner can stop showing a pending cover. */
  fail: () => Promise<unknown>;
  /** Log label, for example "trip" or "destination". */
  label: string;
  /** Looks up the place to search for, or null when the request is stale. */
  request: () => Promise<PendingCover | null>;
  /** Schedules the next attempt after the delay. */
  retry: (delayMs: number) => Promise<unknown>;
};

async function deleteTemporaryCover(ctx: ActionCtx, storageId: Id<'_storage'>, label: string) {
  try {
    await ctx.storage.delete(storageId);
  } catch (error) {
    console.warn(`Unable to clean up a temporary ${label} cover`, error);
  }
}

/**
 * Finds a free-licensed Wikimedia photo for a place and stores it. A failed attempt is
 * retried after 30 seconds, 2 minutes, then 10 minutes before `fail` runs.
 */
export async function generateStockCover(ctx: ActionCtx, job: StockCoverJob): Promise<null> {
  let storedId: Id<'_storage'> | undefined;
  try {
    const pending = await job.request();
    if (!pending) return null;

    const candidates = await searchWikipediaCover(
      pending.query,
      pending.excludedSourceUrl ?? undefined
    );
    const downloaded = await downloadStockCover(candidates);
    storedId = await ctx.storage.store(downloaded.blob);
    const committed = await job.commit({
      attribution: downloaded.attribution,
      storageId: storedId
    });
    if (!committed) await deleteTemporaryCover(ctx, storedId, job.label);
  } catch (error: unknown) {
    if (storedId) await deleteTemporaryCover(ctx, storedId, job.label);
    const retryDelay = RETRY_DELAYS_MS[job.attempt];
    if (retryDelay === undefined) {
      console.warn(`Unable to generate a Wikipedia ${job.label} cover`, error);
      await job.fail();
    } else {
      await job.retry(retryDelay);
    }
  }
  return null;
}
