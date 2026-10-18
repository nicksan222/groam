import type { IdeaListFilters, IdeaListItem, IdeaStatusFilter } from '@/types/ideas';
import type { WorkspaceIdea } from './use-workspace-ideas';
import { isViewerDraft } from './viewer-pending-idea';

export const DEFAULT_IDEA_STATUS_FILTER = 'pending';

export type { IdeaListFilters, IdeaListItem, IdeaStatusFilter };

export const ideaStatusFilterLabels: Record<IdeaStatusFilter, string> = {
  all: 'All incl. drafts',
  merged: 'Settled',
  pending: 'Open'
};

const openStatuses = new Set<WorkspaceIdea['status']>(['conflicted', 'draft', 'in_review']);
const settledStatuses = new Set<WorkspaceIdea['status']>(['closed', 'merged']);

export function matchesIdeaStatus(status: WorkspaceIdea['status'], filter: IdeaStatusFilter) {
  if (filter === 'pending') return openStatuses.has(status);
  if (filter === 'merged') return settledStatuses.has(status);
  return true;
}

function ideaMatchesQuery(proposal: IdeaListItem, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized === '') return true;

  return `${proposal.title} ${proposal.author.name} ${proposal.sourceTripName ?? ''} ${proposal.ideaName}`
    .toLocaleLowerCase()
    .includes(normalized);
}

export function filterWorkspaceIdeas<T extends IdeaListItem>(
  proposals: T[],
  filters: IdeaListFilters,
  viewerUserId?: string | null
) {
  return proposals.filter((proposal) => {
    if (
      filters.status === 'pending' &&
      proposal.status === 'draft' &&
      viewerUserId &&
      !isViewerDraft(proposal, viewerUserId)
    ) {
      return false;
    }
    return (
      matchesIdeaStatus(proposal.status, filters.status) &&
      ideaMatchesQuery(proposal, filters.query)
    );
  });
}
