import type { Doc } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { type OrganizationRoster, systemRoster } from '#convex/modules/auth/workspace';
import { kindPolicy } from '#convex/modules/discussions/kinds/index';
import { participantsForTrip } from '#convex/modules/payments/participation';
import { type PollTally, type PollVoter, tallyPoll } from '#convex/modules/polls/tally';
import { travelersForTrip } from '#convex/modules/travel/travelers/statuses';

export type Ctx = QueryCtx | MutationCtx;
export type PollScope = Pick<Doc<'polls'>, 'discussionId' | 'organizationId' | 'tripId'>;
const MAX_VOTES = 200;

/**
 * Who may vote, before any chat narrows it. Memoizes the roster and each trip's statuses, so a
 * list of polls reads them once per call instead of once per poll.
 */
export function voterLoader(ctx: Ctx) {
  const rosters = new Map<string, Promise<OrganizationRoster>>();
  const scopes = new Map<string, Promise<PollVoter[]>>();
  const roster = (organizationId: string) => {
    let loaded = rosters.get(organizationId);
    if (!loaded) {
      loaded = systemRoster(ctx, organizationId);
      rosters.set(organizationId, loaded);
    }
    return loaded;
  };
  const load = async (poll: PollScope): Promise<PollVoter[]> => {
    if (poll.tripId) {
      const members = (await roster(poll.organizationId)).members;
      const [rows, trip] = await Promise.all([
        travelersForTrip(
          ctx,
          poll.tripId,
          members.map(({ userId }) => userId)
        ),
        ctx.db.get('trips', poll.tripId)
      ]);
      if (!trip) return [];
      const declined = new Set(
        rows.filter(({ status }) => status === 'not_going').map(({ userId }) => userId)
      );
      const candidates = members.filter(({ userId }) => !declined.has(userId));
      // Display statuses already project payment eligibility. Polls need raw RSVP plus exactly
      // one entitlement check per member, including maybe/invited travelers.
      const permitted = await participantsForTrip(
        ctx,
        trip,
        candidates.map(({ userId }) => userId)
      );
      return candidates
        .filter(({ userId }) => permitted.has(userId))
        .map(({ name, userId }) => ({ name, userId }));
    }
    return (await roster(poll.organizationId)).members.map(({ name, userId }) => ({
      name,
      userId
    }));
  };
  return (poll: PollScope): Promise<PollVoter[]> => {
    const key = poll.tripId ?? `org:${poll.organizationId}`;
    let voters = scopes.get(key);
    if (!voters) {
      voters = load(poll);
      scopes.set(key, voters);
    }
    return voters;
  };
}

export type VoterLoader = ReturnType<typeof voterLoader>;

/**
 * Trip polls: listed travelers (members with an account) not marked not going. Workspace polls:
 * group members. A chat with its own audience narrows both to who can read it.
 */
export async function eligibleVoters(
  ctx: Ctx,
  poll: PollScope,
  scopeVoters: VoterLoader = voterLoader(ctx)
): Promise<PollVoter[]> {
  const voters = await scopeVoters(poll);
  if (!poll.discussionId) return voters;
  const discussion = await ctx.db.get('discussions', poll.discussionId);
  if (!discussion) return voters;
  const { audience } = kindPolicy(discussion.kind);
  if (audience === 'owner') {
    return voters.filter((voter) => voter.userId === discussion.createdBy.userId);
  }
  if (audience !== 'members') return voters;
  const memberships = await Promise.all(
    voters.map((voter) =>
      ctx.db
        .query('discussionMembers')
        .withIndex('by_discussionId_and_userId', (query) =>
          query.eq('discussionId', discussion._id).eq('userId', voter.userId)
        )
        .unique()
    )
  );
  return voters.filter((_, index) => memberships[index] !== null);
}

export async function pollVotes(ctx: Ctx, poll: Doc<'polls'>) {
  return await ctx.db
    .query('pollVotes')
    .withIndex('by_pollId_and_userId', (query) => query.eq('pollId', poll._id))
    .take(MAX_VOTES);
}

export async function pollTally(
  ctx: Ctx,
  poll: Doc<'polls'>,
  scopeVoters: VoterLoader = voterLoader(ctx)
): Promise<PollTally> {
  const [eligible, votes] = await Promise.all([
    eligibleVoters(ctx, poll, scopeVoters),
    pollVotes(ctx, poll)
  ]);
  return tallyPoll(poll.options, votes, eligible);
}
