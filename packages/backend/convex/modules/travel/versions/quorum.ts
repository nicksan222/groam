/** Quorum rules shared by idea review and agent waits. A leaf: imports no module. */
import type { Doc } from '#convex-generated/dataModel';

export type Voter = { userId: string };

/** Group members other than the idea author — preferred when independent review is possible. */
export function independentReviewers<V extends Voter>(proposal: Doc<'tripProposals'>, voters: V[]) {
  return voters.filter((voter) => voter.userId !== proposal.author.userId);
}

/** Human reviewers were explicitly asked — author must wait for an independent yes. */
export function requiresIndependentReview(proposal: Doc<'tripProposals'>) {
  return proposal.reviewers.some((reviewer) => reviewer.kind === 'user');
}

/**
 * Who may record an approval. When human reviewers were requested, the author is
 * excluded. Otherwise the author may self-approve and continue.
 */
export function eligibleReviewers<V extends Voter>(proposal: Doc<'tripProposals'>, voters: V[]) {
  if (requiresIndependentReview(proposal)) {
    return independentReviewers(proposal, voters);
  }
  return voters;
}

/** Approvals that count toward the quorum: eligible humans plus the assigned reviewer agent. */
export function countedApprovals(
  proposal: Doc<'tripProposals'>,
  approvals: Array<Doc<'tripProposalApprovals'>>,
  eligibleIds: Set<string>
) {
  const agentAssigned = proposal.reviewers.some((reviewer) => reviewer.kind === 'agent');
  return approvals.filter((approval) =>
    approval.approver.kind === 'agent' ? agentAssigned : eligibleIds.has(approval.approver.userId)
  );
}
