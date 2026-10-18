import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import { isOrganizationManager, type Workspace } from '#convex/modules/auth/workspace';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import { type Ctx, eligibleVoters } from '#convex/modules/polls/eligibility';
import { findVisibleTrip } from '#convex/modules/travel/trips/visibility';

/** A poll outside the group, on a hidden trip, or in a chat the viewer is not in is unreadable. */
export async function canRead(
  ctx: Ctx,
  poll: Doc<'polls'>,
  workspace: Workspace
): Promise<boolean> {
  if (poll.organizationId !== workspace.organizationId) return false;
  if (poll.tripId && !(await findVisibleTrip(ctx, poll.tripId, workspace))) return false;
  if (!poll.discussionId) return true;
  return await DiscussionAccess.forWorkspace(ctx, poll.discussionId, workspace).then(
    () => true,
    () => false
  );
}

/** An unreadable poll reads as missing. */
export async function readablePoll(
  ctx: Ctx,
  pollId: Id<'polls'>,
  workspace: Workspace
): Promise<Doc<'polls'>> {
  const poll = await ctx.db.get('polls', pollId);
  if (!poll || !(await canRead(ctx, poll, workspace))) throw new ConvexError('Poll not found');
  return poll;
}

/** Votes, retractions, and closing stop once the poll's trip is archived. */
export async function assertPollWritable(ctx: Ctx, poll: Doc<'polls'>): Promise<void> {
  const trip = poll.tripId ? await ctx.db.get('trips', poll.tripId) : null;
  if (trip?.archive !== undefined) throw new ConvexError('Archived trips are read-only');
}

export async function canVote(
  ctx: Ctx,
  poll: Doc<'polls'>,
  workspace: Workspace
): Promise<boolean> {
  if (poll.status !== 'open') return false;
  return (await eligibleVoters(ctx, poll)).some((voter) => voter.userId === workspace.userId);
}

/** The creator (or, for an agent's poll, the person who started the run) or a group admin. */
export async function canManage(
  ctx: Ctx,
  poll: Doc<'polls'>,
  workspace: Workspace
): Promise<boolean> {
  if (isOrganizationManager(workspace.organizationRole)) return true;
  if (poll.createdBy.kind === 'user') return poll.createdBy.userId === workspace.userId;
  const run = await ctx.db.get('agentRuns', poll.createdBy.runId);
  return run?.createdBy.userId === workspace.userId;
}
