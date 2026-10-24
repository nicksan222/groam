import type { PaginationOptions, PaginationResult } from 'convex/server';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import type { Workspace } from '#convex/modules/auth/workspace';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import { canManage, canRead, isPollWritable, readablePoll } from '#convex/modules/polls/access';
import {
  eligibleVoters,
  pollVotes,
  type VoterLoader,
  voterLoader
} from '#convex/modules/polls/eligibility';
import { OPEN_POLLS_FIRST_PAGE } from '#convex/modules/polls/limits';
import type { PollView } from '#convex/modules/polls/schema';
import { tallyPoll } from '#convex/modules/polls/tally';
import { type SeatedTripLoader, seatedTripLoader } from '#convex/modules/travel/trips/visibility';
import { isPollYourTurn } from '#convex/modules/travel/turn';

const DISCUSSION_LIMIT = 50;

type PollStatus = Doc<'polls'>['status'];

async function present(
  ctx: QueryCtx,
  poll: Doc<'polls'>,
  workspace: Workspace,
  voters: VoterLoader
): Promise<PollView> {
  const [eligible, votes, manageable, writable] = await Promise.all([
    eligibleVoters(ctx, poll, voters),
    pollVotes(ctx, poll),
    canManage(ctx, poll, workspace),
    isPollWritable(ctx, poll)
  ]);
  const tally = tallyPoll(poll.options, votes, eligible);
  return {
    canClose: writable && poll.status === 'open' && manageable,
    canDelete: writable && manageable,
    canVote:
      writable &&
      poll.status === 'open' &&
      eligible.some((voter) => voter.userId === workspace.userId),
    closedAt: poll.closedAt ?? null,
    closesAt: poll.closesAt ?? null,
    createdAt: poll._creationTime,
    createdBy: { kind: poll.createdBy.kind, name: poll.createdBy.name },
    discussionId: poll.discussionId ?? null,
    eligibleCount: tally.eligibleCount,
    id: poll._id,
    multiSelect: poll.multiSelect,
    myOptionIds: votes.find((vote) => vote.userId === workspace.userId)?.optionIds ?? [],
    question: poll.question,
    status: poll.status,
    tallies: tally.tallies,
    tripId: poll.tripId ?? null,
    updatedAt: poll.updatedAt,
    votedCount: tally.votedCount,
    voters: tally.voted
  };
}

async function get(ctx: QueryCtx, workspace: Workspace, pollId: Id<'polls'>): Promise<PollView> {
  const poll = await readablePoll(ctx, pollId, workspace);
  return await present(ctx, poll, workspace, voterLoader(ctx));
}

/** Drops polls the viewer cannot read; one roster read serves the whole list. */
async function presentReadable(
  ctx: QueryCtx,
  workspace: Workspace,
  polls: Array<Doc<'polls'>>,
  seatedTrip: SeatedTripLoader = seatedTripLoader(ctx, workspace)
): Promise<PollView[]> {
  const visible = await Promise.all(polls.map((poll) => canRead(ctx, poll, workspace, seatedTrip)));
  const voters = voterLoader(ctx);
  return await Promise.all(
    polls.filter((_, index) => visible[index]).map((poll) => present(ctx, poll, workspace, voters))
  );
}

async function presentPage(
  ctx: QueryCtx,
  workspace: Workspace,
  page: PaginationResult<Doc<'polls'>>,
  seatedTrip?: SeatedTripLoader
): Promise<PaginationResult<PollView>> {
  return { ...page, page: await presentReadable(ctx, workspace, page.page, seatedTrip) };
}

/** A trip's polls with one status, newest first. */
async function listForTrip(
  ctx: QueryCtx,
  workspace: Workspace,
  {
    paginationOpts,
    status,
    tripId
  }: { paginationOpts: PaginationOptions; status: PollStatus; tripId: Id<'trips'> }
): Promise<PaginationResult<PollView>> {
  const seatedTrip = seatedTripLoader(ctx, workspace);
  if (!(await seatedTrip(tripId))) {
    return { continueCursor: '', isDone: true, page: [] };
  }
  const page = await ctx.db
    .query('polls')
    .withIndex('by_tripId_and_status', (query) => query.eq('tripId', tripId).eq('status', status))
    .order('desc')
    .paginate(paginationOpts);
  return await presentPage(ctx, workspace, page, seatedTrip);
}

/**
 * The open polls of a trip that wait on the viewer, for Home. The caller has loaded the trip for
 * the viewer, so only chat-linked polls are checked for access. Reads no tallies: per poll it
 * asks only whether the viewer may vote (voters are loaded once for the trip) and has not.
 */
async function listTurnForTrip(
  ctx: QueryCtx,
  workspace: Workspace,
  trip: Doc<'trips'>
): Promise<
  Array<{ closesAt: number | null; id: Id<'polls'>; question: string; updatedAt: number }>
> {
  if (trip.archive !== undefined) return [];
  const polls = await ctx.db
    .query('polls')
    .withIndex('by_tripId_and_status', (query) => query.eq('tripId', trip._id).eq('status', 'open'))
    .order('desc')
    .take(OPEN_POLLS_FIRST_PAGE);
  const voters = voterLoader(ctx);
  const waiting = await Promise.all(
    polls.map(async (poll) => {
      if (poll.discussionId && !(await canRead(ctx, poll, workspace))) return null;
      const [eligible, vote] = await Promise.all([
        eligibleVoters(ctx, poll, voters),
        ctx.db
          .query('pollVotes')
          .withIndex('by_pollId_and_userId', (query) =>
            query.eq('pollId', poll._id).eq('userId', workspace.userId)
          )
          .unique()
      ]);
      const mine = {
        canVote: eligible.some((voter) => voter.userId === workspace.userId),
        myOptionIds: vote?.optionIds ?? [],
        status: poll.status
      };
      return isPollYourTurn(mine)
        ? {
            closesAt: poll.closesAt ?? null,
            id: poll._id,
            question: poll.question,
            updatedAt: poll.updatedAt
          }
        : null;
    })
  );
  return waiting.filter((poll) => poll !== null);
}

/** The polls shown in a chat timeline: the newest, bounded like the timeline's other events. */
async function listForDiscussion(
  ctx: QueryCtx,
  workspace: Workspace,
  discussionId: Id<'discussions'>
): Promise<PollView[]> {
  await DiscussionAccess.forWorkspace(ctx, discussionId, workspace);
  const polls = await ctx.db
    .query('polls')
    .withIndex('by_discussionId', (query) => query.eq('discussionId', discussionId))
    .order('desc')
    .take(DISCUSSION_LIMIT);
  return await presentReadable(ctx, workspace, polls);
}

export const PollReads = {
  get,
  listForDiscussion,
  listForTrip,
  listTurnForTrip
};
