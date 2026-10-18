import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { AgentWaits } from '#convex/modules/assistant/waits/index';

const MAX_VOTES = 200;
/** Each poll also deletes its votes and resolves its waits, so batches stay small. */
const MAX_POLLS_PER_BATCH = 10;

/**
 * Deletes a poll and its votes. Waits on it resolve as cancelled first (with the final tally
 * in their snapshot), so a suspended run resumes knowing the poll is gone.
 */
export async function removePoll(ctx: MutationCtx, poll: Doc<'polls'>): Promise<void> {
  await AgentWaits.signal(ctx, { deleted: true, kind: 'poll', refId: poll._id });
  const votes = await ctx.db
    .query('pollVotes')
    .withIndex('by_pollId_and_userId', (query) => query.eq('pollId', poll._id))
    .take(MAX_VOTES);
  await Promise.all(votes.map((vote) => ctx.db.delete('pollVotes', vote._id)));
  await ctx.db.delete('polls', poll._id);
}

async function removeAll(ctx: MutationCtx, polls: Array<Doc<'polls'>>): Promise<boolean> {
  for (const poll of polls) await removePoll(ctx, poll);
  return polls.length > 0;
}

/** One batch of a trip's polls; true while more remain. */
async function purgeForTrip(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  batchSize: number
): Promise<boolean> {
  return await removeAll(
    ctx,
    await ctx.db
      .query('polls')
      .withIndex('by_tripId_and_status', (query) => query.eq('tripId', tripId))
      .take(Math.min(batchSize, MAX_POLLS_PER_BATCH))
  );
}

/** One batch of the polls shown in a chat; true while more remain. */
async function purgeForDiscussion(
  ctx: MutationCtx,
  discussionId: Id<'discussions'>,
  batchSize: number
): Promise<boolean> {
  return await removeAll(
    ctx,
    await ctx.db
      .query('polls')
      .withIndex('by_discussionId', (query) => query.eq('discussionId', discussionId))
      .take(Math.min(batchSize, MAX_POLLS_PER_BATCH))
  );
}

/** One batch of a group's remaining polls; true while more remain. */
async function purgeForOrganization(
  ctx: MutationCtx,
  organizationId: string,
  batchSize: number
): Promise<boolean> {
  return await removeAll(
    ctx,
    await ctx.db
      .query('polls')
      .withIndex('by_organizationId_and_status', (query) =>
        query.eq('organizationId', organizationId)
      )
      .take(Math.min(batchSize, MAX_POLLS_PER_BATCH))
  );
}

/** Cascade deletes for polls. A leaf: imports no trip or discussion module. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class PollCleanup {
  static purgeForDiscussion = purgeForDiscussion;
  static purgeForOrganization = purgeForOrganization;
  static purgeForTrip = purgeForTrip;
  static removePoll = removePoll;
}
