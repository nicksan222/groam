import type { ProposalDetail } from '@/types/trips';

export function needsSharedTripUpdate(proposal: Pick<ProposalDetail, 'sourceChanged' | 'status'>) {
  return proposal.sourceChanged || proposal.status === 'conflicted';
}
