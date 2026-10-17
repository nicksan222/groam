import type { PaginationOptions, PaginationResult } from 'convex/server';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import type { Workspace } from '#convex/modules/auth/workspace';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import { canManage, canRead, readablePoll } from '#convex/modules/polls/access';
import {
  eligibleVoters,
  pollVotes,
  type VoterLoader,
  voterLoader
} from '#convex/modules/polls/eligibility';
import type { PollView } from '#convex/modules/polls/schema';
import { tallyPoll } from '#convex/modules/polls/tally';
import { findVisibleTrip } from '#convex/modules/travel/trips/visibility';

const DISCUSSION_LIMIT = 50;

type PollStatus = Doc<'polls'>['status'];

async function present(
  ctx: QueryCtx,
  poll: Doc<'polls'>,
  workspace: Workspace,
  voters: VoterLoader
): Promise<PollView> {
  const [eligible, votes, manageable] = await Promise.all([
    eligibleVoters(ctx, poll, voters),
    pollVotes(ctx, poll),
    canManage(ctx, poll, workspace)
  ]);
  const tally = tallyPoll(poll.options, votes, eligible);
  return {
    canClose: poll.status === 'open' && manageable,
    canVote: poll.status === 'open' && eligible.some((voter) => voter.userId === workspace.userId),
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
  polls: Array<Doc<'polls'>>
): Promise<PollView[]> {
  const visible = await Promise.all(polls.map((poll) => canRead(ctx, poll, workspace)));
  const voters = voterLoader(ctx);
  return await Promise.all(
    polls.filter((_, index) => visible[index]).map((poll) => present(ctx, poll, workspace, voters))
  );
}

async function presentPage(
  ctx: QueryCtx,
  workspace: Workspace,
  page: PaginationResult<Doc<'polls'>>
): Promise<PaginationResult<PollView>> {
  return { ...page, page: await presentReadable(ctx, workspace, page.page) };
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
  if (!(await findVisibleTrip(ctx, tripId, workspace))) {
    return { continueCursor: '', isDone: true, page: [] };
  }
  const page = await ctx.db
    .query('polls')
    .withIndex('by_tripId_and_status', (query) => query.eq('tripId', tripId).eq('status', status))
    .order('desc')
    .paginate(paginationOpts);
  return await presentPage(ctx, workspace, page);
}

/** Group polls not tied to a trip, with one status, newest first. */
async function listForWorkspace(
  ctx: QueryCtx,
  workspace: Workspace,
  { paginationOpts, status }: { paginationOpts: PaginationOptions; status: PollStatus }
): Promise<PaginationResult<PollView>> {
  const page = await ctx.db
    .query('polls')
    .withIndex('by_organizationId_and_tripId_and_status', (query) =>
      query
        .eq('organizationId', workspace.organizationId)
        .eq('tripId', undefined)
        .eq('status', status)
    )
    .order('desc')
    .paginate(paginationOpts);
  return await presentPage(ctx, workspace, page);
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

export const PollReads = { get, listForDiscussion, listForTrip, listForWorkspace };
