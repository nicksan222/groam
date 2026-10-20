import type { PaginationOptions } from 'convex/server';
import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import type { Workspace } from '#convex/modules/auth/workspace';
import { canRead } from '#convex/modules/polls/access';
import { pollTally, voterLoader } from '#convex/modules/polls/eligibility';
import type { PollOpenItem } from '#convex/modules/polls/schema';

const OPEN_LIMIT = 10;
/** Open polls scanned before visibility filtering; bounds the read when many are hidden. */
const OPEN_SCAN = 50;

/** Newest open polls across every scope the viewer can read: trips, the group, and chats. */
async function listOpen(
  ctx: QueryCtx,
  workspace: Workspace,
  limit: number = OPEN_LIMIT
): Promise<PollOpenItem[]> {
  const rows = await ctx.db
    .query('polls')
    .withIndex('by_organizationId_and_status', (query) =>
      query.eq('organizationId', workspace.organizationId).eq('status', 'open')
    )
    .order('desc')
    .take(OPEN_SCAN);
  return presentOpen(ctx, workspace, rows, limit);
}

/** Raw candidate pages retain continuation even when no polls are readable. */
async function pageOpen(ctx: QueryCtx, workspace: Workspace, paginationOpts: PaginationOptions) {
  if (
    !Number.isInteger(paginationOpts.numItems) ||
    paginationOpts.numItems < 1 ||
    paginationOpts.numItems > OPEN_SCAN
  )
    throw new ConvexError(`Poll page size must be between 1 and ${OPEN_SCAN}`);
  const result = await ctx.db
    .query('polls')
    .withIndex('by_organizationId_and_status', (q) =>
      q.eq('organizationId', workspace.organizationId).eq('status', 'open')
    )
    .order('desc')
    .paginate({ ...paginationOpts, maximumRowsRead: OPEN_SCAN });
  return { ...result, page: await presentOpen(ctx, workspace, result.page) };
}

async function presentOpen(
  ctx: QueryCtx,
  workspace: Workspace,
  rows: Doc<'polls'>[],
  limit = rows.length
): Promise<PollOpenItem[]> {
  const visible = await Promise.all(rows.map((poll) => canRead(ctx, poll, workspace)));
  const readable = rows.filter((_, index) => visible[index]).slice(0, limit);
  const voters = voterLoader(ctx);
  const trips = new Map<Id<'trips'>, Promise<Doc<'trips'> | null>>();
  const tripOf = (tripId: Id<'trips'>) => {
    let trip = trips.get(tripId);
    if (!trip) {
      trip = ctx.db.get('trips', tripId);
      trips.set(tripId, trip);
    }
    return trip;
  };
  return await Promise.all(
    readable.map(async (poll) => {
      const [tally, mine, trip] = await Promise.all([
        pollTally(ctx, poll, voters),
        ctx.db
          .query('pollVotes')
          .withIndex('by_pollId_and_userId', (query) =>
            query.eq('pollId', poll._id).eq('userId', workspace.userId)
          )
          .unique(),
        poll.tripId ? tripOf(poll.tripId) : null
      ]);
      return {
        closesAt: poll.closesAt ?? null,
        createdAt: poll._creationTime,
        discussionId: poll.discussionId ?? null,
        id: poll._id,
        optionCount: poll.options.length,
        question: poll.question,
        tripId: poll.tripId ?? null,
        tripName: trip?.name ?? null,
        viewerHasVoted: (mine?.optionIds.length ?? 0) > 0,
        votedCount: tally.votedCount
      };
    })
  );
}

export const PollOpenReads = { listOpen, pageOpen };
