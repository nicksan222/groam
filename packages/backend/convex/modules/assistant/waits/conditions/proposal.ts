import { ConvexError } from 'convex/values';
import type { Doc } from '#convex-generated/dataModel';
import {
  defineWaitCondition,
  memoized,
  type WaitLoadMemo,
  type WaitReadCtx
} from '#convex/modules/assistant/waits/conditions/types';
import { type OrganizationRoster, systemRoster } from '#convex/modules/auth/workspace';
import { findSeatedTrip, MAX_GROUP_MEMBERS } from '#convex/modules/travel/trips/visibility';
import { countedApprovals, eligibleReviewers } from '#convex/modules/travel/versions/quorum';

type LoadedProposal = { approvals: number; proposal: Doc<'tripProposals'> } | null;

/** Approvals that count, exactly as applying the idea counts them (departed reviewers do not). */
async function countApprovals(
  ctx: WaitReadCtx,
  proposal: Doc<'tripProposals'>,
  memo: WaitLoadMemo
): Promise<number> {
  const [approvals, roster] = await Promise.all([
    ctx.db
      .query('tripProposalApprovals')
      .withIndex('by_proposalId', (query) => query.eq('proposalId', proposal._id))
      .take(MAX_GROUP_MEMBERS + 1),
    memoized<Promise<OrganizationRoster>>(memo, `roster:${proposal.organizationId}`, () =>
      systemRoster(ctx, proposal.organizationId)
    )
  ]);
  const eligibleIds = new Set(
    eligibleReviewers(proposal, roster.members).map((member) => member.userId)
  );
  return countedApprovals(proposal, approvals, eligibleIds).length;
}

/**
 * `approved`: applied, or in review with the quorum of counted approvals. `decided`: applied or
 * passed on.
 */
export const proposalCondition = defineWaitCondition({
  judge: (condition, loaded: LoadedProposal) => {
    if (!loaded) {
      return {
        met: false,
        progress: null,
        snapshot: {
          approvals: 0,
          kind: 'proposal',
          proposalId: condition.proposalId,
          required: 0,
          status: 'deleted',
          title: 'Deleted idea'
        },
        summary: 'The idea was deleted'
      };
    }
    const { approvals, proposal } = loaded;
    const required = proposal.requiredApprovals;
    const merged = proposal.status === 'merged';
    const decided = merged || proposal.status === 'closed';
    const approved = merged || (proposal.status === 'in_review' && approvals >= required);
    return {
      met: condition.until === 'decided' ? decided : approved,
      progress: `${approvals} of ${required} approvals`,
      snapshot: {
        approvals,
        kind: 'proposal',
        proposalId: proposal._id,
        required,
        status: proposal.status,
        title: proposal.title
      },
      summary: `idea '${proposal.title}' is ${proposal.status.replace('_', ' ')} with ${approvals} of ${required} approvals`
    };
  },
  kind: 'proposal',
  label: async (ctx, condition) => {
    const proposal = await ctx.db.get('tripProposals', condition.proposalId);
    if (!proposal) return 'a deleted idea';
    return condition.until === 'approved'
      ? `idea “${proposal.title}” to be approved`
      : `a decision on idea “${proposal.title}”`;
  },
  load: async (ctx, condition, memo): Promise<LoadedProposal> => {
    const proposal = await ctx.db.get('tripProposals', condition.proposalId);
    return proposal ? { approvals: await countApprovals(ctx, proposal, memo), proposal } : null;
  },
  refId: (condition) => condition.proposalId,
  validate: async (ctx, condition, scope) => {
    const proposal = await ctx.db.get('tripProposals', condition.proposalId);
    // The run acts for its creator, so it may only watch an idea on a trip they can read.
    if (
      !proposal ||
      proposal.organizationId !== scope.organizationId ||
      !(await findSeatedTrip(ctx, proposal.sourceTripId, scope.viewer))
    ) {
      throw new ConvexError('Idea not found');
    }
    if (
      scope.tripId &&
      proposal.sourceTripId !== scope.tripId &&
      proposal.workingTripId !== scope.tripId
    ) {
      throw new ConvexError('That idea belongs to another trip');
    }
    return { tripId: proposal.sourceTripId };
  }
});
