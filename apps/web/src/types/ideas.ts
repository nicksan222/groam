import type { Id } from '@groam/backend/data-model';
import type { ideaCloneViews } from '@/features/ideas/idea-clone/idea-sections';
import type { PlannedCalendarActivity, ProposalDetail, TripProposal } from '@/types/trips';

export type IdeaCloneView = (typeof ideaCloneViews)[number];

/** The views of an idea's working copy that read or edit the trip itself, not its change review. */
export type IdeaPlanningSection = Exclude<IdeaCloneView, 'compare'>;

export type TripIdea = TripProposal;
export type IdeaStatus = TripIdea['status'];

export type IdeaHrefProposal = Pick<TripIdea, 'id' | 'status'> &
  Partial<{ sourceTripId: Id<'trips'>; workingTripId: Id<'trips'> }>;

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
  author: Pick<TripIdea['author'], 'userId'>;
  id: string;
  status: TripIdea['status'];
} & Partial<{
  ideaName: TripIdea['ideaName'];
  sourceTripId: string;
  title: TripIdea['title'];
  updatedAt: TripIdea['updatedAt'];
  workingTripId: string;
}>;

export type IdeaCloneSearch = {
  addDestination?: boolean;
};

export type StartIdeaIntent = {
  /** An activity planned on the calendar, added to the idea once its calendar opens. */
  addActivity?: PlannedCalendarActivity;
  addDestination?: boolean;
  firstDestination?: boolean;
  /** Gear item label to claim for the viewer once the new idea's Packing tab opens. */
  claimGear?: string;
  section?: 'calendar' | 'itinerary' | 'overview' | 'packing';
  titleHint?: string;
};

export type Reviewer = ProposalDetail['reviewers'][number];
