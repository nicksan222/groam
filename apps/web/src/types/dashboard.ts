import type { api } from '@groam/backend/api';
import type { FunctionReturnType } from 'convex/server';
import type { TripListItem, WorkspaceTripProposal } from '@/types/trips';

export type DashboardBuckets = {
  activeTrips: TripListItem[];
  ideaSnapshot: {
    conflicts: number;
    decided: number;
    drafts: number;
    inReview: number;
    total: number;
  };
  metrics: {
    activeTrips: number;
    openIdeas: number;
    settled: number;
    waitingOnYou: number;
  };
  recentlySettled: WorkspaceTripProposal[];
  tripsNeedingAttention: TripListItem[];
  waitingOnYou: WorkspaceTripProposal[];
  yourDrafts: WorkspaceTripProposal[];
};

export type DashboardPresentation =
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'loading' }
  | { buckets: DashboardBuckets; kind: 'ready' };

export type DashboardPoll = FunctionReturnType<
  typeof api.routes.polls.list.open.page.run
>['page'][number];

export type DashboardResearch = FunctionReturnType<
  typeof api.routes.discussions.research.workspace.page.run
>['page'][number];

export type DashboardSeeAllTarget = { label: string; to: '/agents' | '/issues' };
