import type { Id } from '@groam/backend/data-model';
import type { ideaCloneViews } from '@/features/ideas/idea-clone/idea-sections';
import type { ProposalDetail, WorkspaceTripProposal } from '@/types/trips';

export type IdeaCloneView = (typeof ideaCloneViews)[number];

export type WorkspaceIdea = WorkspaceTripProposal;
export type IdeaStatus = WorkspaceIdea['status'];

export type IdeaHrefProposal = Pick<WorkspaceIdea, 'id' | 'status'> &
  Partial<Pick<WorkspaceIdea, 'sourceTripId' | 'workingTripId'>>;

export type IdeaCloneHref = {
  params: { proposalId: Id<'tripProposals'>; tripId: Id<'trips'>; view: IdeaCloneView };
  search: { addDestination?: boolean };
  to: '/trips/$tripId/ideas/$proposalId/$view';
};

export type IdeaWorkspaceHref =
  | IdeaCloneHref
  | {
      params: { proposalId: Id<'tripProposals'> };
      to: '/ideas/$proposalId';
    };

export type IdeaStatusFilter = 'all' | 'merged' | 'pending';

export type IdeaListItem = Pick<
  WorkspaceIdea,
  'author' | 'id' | 'ideaName' | 'status' | 'title'
> & {
  sourceTripName?: WorkspaceIdea['sourceTripName'];
};

export type IdeaListFilters = {
  query: string;
  status: IdeaStatusFilter;
};

export type IdeaPrimaryActionIntent = 'approve' | 'merge' | 'rebase' | 'submit';

export type IdeaPrimaryAction = {
  intent: IdeaPrimaryActionIntent;
  label: string;
};

export type IdeaActionProposal = {
  author: { userId: string };
  canApprove?: boolean;
  canMerge?: boolean;
  canRebase?: boolean;
  hasApproved?: boolean;
  status: IdeaStatus;
};

export type ViewerIdea = {
  author: Pick<WorkspaceIdea['author'], 'userId'>;
  id: string;
  status: WorkspaceIdea['status'];
} & Partial<{
  ideaName: WorkspaceIdea['ideaName'];
  sourceTripId: string;
  title: WorkspaceIdea['title'];
  updatedAt: WorkspaceIdea['updatedAt'];
  workingTripId: string;
}>;

export type IdeaCloneSearch = {
  addDestination?: boolean;
};

export type StartIdeaIntent = {
  addDestination?: boolean;
  firstDestination?: boolean;
  section?: 'itinerary' | 'overview';
  titleHint?: string;
};

export type Reviewer = ProposalDetail['reviewers'][number];
