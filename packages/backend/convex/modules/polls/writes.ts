import { ConvexError } from 'convex/values';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import type { Workspace } from '#convex/modules/auth/workspace';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import { assertPollWritable, canManage, canVote, readablePoll } from '#convex/modules/polls/access';
import { removePoll } from '#convex/modules/polls/cleanup';
import { POLL_LIMITS, type PollCreateInput, type PollCreator } from '#convex/modules/polls/schema';
import { findVisibleTrip } from '#convex/modules/travel/trips/visibility';

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeQuestion(question: string): string {
  const trimmed = question.trim();
  if (trimmed.length === 0 || trimmed.length > POLL_LIMITS.questionLength) {
    throw new ConvexError(`A poll question needs 1 to ${POLL_LIMITS.questionLength} characters`);
  }
  return trimmed;
}

function normalizeOptions(options: string[]) {
  const labels = options.map((label) => label.trim());
  if (labels.length < POLL_LIMITS.minOptions || labels.length > POLL_LIMITS.maxOptions) {
    throw new ConvexError(
      `A poll needs ${POLL_LIMITS.minOptions} to ${POLL_LIMITS.maxOptions} options`
    );
  }
  if (labels.some((label) => label.length === 0 || label.length > POLL_LIMITS.optionLength)) {
    throw new ConvexError(`Each option needs 1 to ${POLL_LIMITS.optionLength} characters`);
  }
  if (new Set(labels.map((label) => label.toLocaleLowerCase())).size !== labels.length) {
    throw new ConvexError('Options must be different');
  }
  return labels.map((label, index) => ({ id: `o${index + 1}`, label }));
}

function assertClosesAt(closesAt: number | undefined, now: number): void {
  if (closesAt === undefined) return;
  if (
    !Number.isFinite(closesAt) ||
    closesAt <= now ||
    closesAt - now > POLL_LIMITS.maxOpenDays * DAY_MS
  ) {
    throw new ConvexError(
      `A poll must close in the future, at most ${POLL_LIMITS.maxOpenDays} days from now`
    );
  }
}

async function signalPoll(ctx: MutationCtx, pollId: Id<'polls'>): Promise<void> {
  await AgentWaits.signal(ctx, { kind: 'poll', refId: pollId });
}

/** A chat poll takes the chat's trip; a trip poll must sit on a writable shared trip. */
async function resolveScope(ctx: MutationCtx, workspace: Workspace, input: PollCreateInput) {
  let tripId = input.tripId;
  if (input.discussionId) {
    const access = await DiscussionAccess.forWorkspace(ctx, input.discussionId, workspace);
    access.assertWritable();
    const chatTrip = 'tripId' in access.discussion ? access.discussion.tripId : undefined;
    // A chat poll lives where the chat lives; it never borrows another trip.
    if (tripId && tripId !== chatTrip) {
      throw new ConvexError('The poll trip must match the chat trip');
    }
    tripId = tripId ?? chatTrip;
  }
  if (tripId) {
    const trip = await findVisibleTrip(ctx, tripId, workspace);
    if (!trip) throw new ConvexError('Trip not found');
    if (trip.proposal) throw new ConvexError('Polls belong to the shared trip, not an idea');
    if (trip.archive !== undefined) throw new ConvexError('Archived trips are read-only');
  }
  return { discussionId: input.discussionId, tripId };
}

async function create(
  ctx: MutationCtx,
  workspace: Workspace,
  input: PollCreateInput,
  creator: PollCreator
): Promise<Id<'polls'>> {
  const question = normalizeQuestion(input.question);
  const options = normalizeOptions(input.options);
  const now = Date.now();
  assertClosesAt(input.closesAt, now);
  const scope = await resolveScope(ctx, workspace, input);
  const pollId = await ctx.db.insert('polls', {
    ...(input.closesAt === undefined ? {} : { closesAt: input.closesAt }),
    createdBy: creator,
    ...(scope.discussionId ? { discussionId: scope.discussionId } : {}),
    multiSelect: input.multiSelect,
    options,
    organizationId: workspace.organizationId,
    question,
    status: 'open',
    ...(scope.tripId ? { tripId: scope.tripId } : {}),
    updatedAt: now
  });
  if (input.closesAt !== undefined) {
    await ctx.scheduler.runAt(input.closesAt, internal.modules.polls.functions.closeScheduled, {
      pollId
    });
  }
  return pollId;
}

async function findVote(ctx: MutationCtx, pollId: Id<'polls'>, userId: string) {
  return await ctx.db
    .query('pollVotes')
    .withIndex('by_pollId_and_userId', (query) => query.eq('pollId', pollId).eq('userId', userId))
    .unique();
}

/** Casts or replaces the caller's vote. */
async function vote(
  ctx: MutationCtx,
  workspace: Workspace,
  pollId: Id<'polls'>,
  optionIds: string[]
): Promise<null> {
  const poll = await readablePoll(ctx, pollId, workspace);
  if (poll.status !== 'open') throw new ConvexError('This poll is closed');
  await assertPollWritable(ctx, poll);
  if (!(await canVote(ctx, poll, workspace))) {
    throw new ConvexError('You cannot vote on this poll');
  }
  const unique = [...new Set(optionIds)];
  if (unique.length === 0) throw new ConvexError('Pick an option');
  if (!poll.multiSelect && unique.length !== 1) throw new ConvexError('Pick one option');
  const known = new Set(poll.options.map((option) => option.id));
  if (unique.some((id) => !known.has(id))) throw new ConvexError('Unknown option');
  const existing = await findVote(ctx, pollId, workspace.userId);
  const now = Date.now();
  if (existing) {
    await ctx.db.patch('pollVotes', existing._id, { optionIds: unique, updatedAt: now });
  } else {
    await ctx.db.insert('pollVotes', {
      name: workspace.viewerName,
      optionIds: unique,
      organizationId: workspace.organizationId,
      pollId,
      updatedAt: now,
      userId: workspace.userId
    });
  }
  await signalPoll(ctx, pollId);
  return null;
}

async function retract(ctx: MutationCtx, workspace: Workspace, pollId: Id<'polls'>): Promise<null> {
  const poll = await readablePoll(ctx, pollId, workspace);
  if (poll.status !== 'open') throw new ConvexError('This poll is closed');
  await assertPollWritable(ctx, poll);
  const existing = await findVote(ctx, pollId, workspace.userId);
  if (!existing) return null;
  await ctx.db.delete('pollVotes', existing._id);
  await signalPoll(ctx, pollId);
  return null;
}

async function closePoll(ctx: MutationCtx, pollId: Id<'polls'>): Promise<null> {
  const now = Date.now();
  await ctx.db.patch('polls', pollId, { closedAt: now, status: 'closed', updatedAt: now });
  await signalPoll(ctx, pollId);
  return null;
}

async function close(ctx: MutationCtx, workspace: Workspace, pollId: Id<'polls'>): Promise<null> {
  const poll = await readablePoll(ctx, pollId, workspace);
  if (poll.status === 'closed') return null;
  if (!(await canManage(ctx, poll, workspace))) {
    throw new ConvexError('Only the poll creator or a group admin can close this poll');
  }
  await assertPollWritable(ctx, poll);
  return await closePoll(ctx, pollId);
}

/** `closesAt` handler. A no-op once the poll closed another way or was deleted. */
async function closeScheduled(ctx: MutationCtx, pollId: Id<'polls'>): Promise<null> {
  const poll = await ctx.db.get('polls', pollId);
  if (poll?.status !== 'open') return null;
  return await closePoll(ctx, pollId);
}

/** Deletes the poll; waits on it resolve as cancelled. Same rule as closing. */
async function remove(ctx: MutationCtx, workspace: Workspace, pollId: Id<'polls'>): Promise<null> {
  const poll = await readablePoll(ctx, pollId, workspace);
  if (!(await canManage(ctx, poll, workspace))) {
    throw new ConvexError('Only the poll creator or a group admin can delete this poll');
  }
  await removePoll(ctx, poll);
  return null;
}

export const PollWrites = { close, closeScheduled, create, remove, retract, vote };
