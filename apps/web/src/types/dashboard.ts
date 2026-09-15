import type { TripListItem, WorkspaceTripProposal } from '@/types/trips';

export type DashboardBuckets = {
  activeTrips: TripListItem[];
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
