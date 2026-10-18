import type { WorkspaceIdea } from '@/features/ideas/hooks/use-workspace-ideas';
import { ideaWorkspaceHref } from './idea-href';

const openIdeaStatuses = new Set<WorkspaceIdea['status']>(['draft', 'in_review', 'conflicted']);

export function filterOpenIdeas(proposals: WorkspaceIdea[]) {
  return proposals.filter((proposal) => openIdeaStatuses.has(proposal.status));
}

export function isActiveOpenIdea(
  proposal: WorkspaceIdea,
  activeProposalId: string | null,
  activeTripId: string | null
) {
  return (
    activeProposalId === proposal.id ||
    (openIdeaStatuses.has(proposal.status) && activeTripId === proposal.workingTripId)
  );
}

export function isIdeasIndexActive(pathname: string) {
  return pathname === '/ideas' || pathname === '/ideas/';
}

export function showEmptyPortfolio(proposalCount: number, canFetchMore: boolean) {
  return proposalCount === 0 && !canFetchMore;
}

export function proposalHref(proposal: WorkspaceIdea) {
  return ideaWorkspaceHref(proposal);
}
