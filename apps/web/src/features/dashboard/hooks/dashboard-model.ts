import { ideaStatusLabel } from '@/features/ideas/idea-status';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import { displayInitials } from '@/lib/display-initials';
import type { DashboardBuckets, DashboardPresentation } from '@/types/dashboard';

const DAY_MS = 86_400_000;
const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const absoluteDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

const openIdeaStatuses = new Set<WorkspaceTripProposal['status']>([
  'conflicted',
  'draft',
  'in_review'
]);
const shapingStatuses = new Set<WorkspaceTripProposal['status']>(['conflicted', 'draft']);
const settledStatuses = new Set<WorkspaceTripProposal['status']>(['closed', 'merged']);

export const proposalStatusLabel: Record<WorkspaceTripProposal['status'], string> = {
  closed: ideaStatusLabel('closed'),
  conflicted: ideaStatusLabel('conflicted'),
  draft: ideaStatusLabel('draft'),
  in_review: ideaStatusLabel('in_review'),
  merged: ideaStatusLabel('merged')
};

export type { DashboardBuckets, DashboardPresentation };

export function greetingForHour(hour: number) {
  if (hour < 5) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const initials = displayInitials;

export function relativeDate(timestamp: number, now = Date.now()) {
  const days = Math.round((timestamp - now) / DAY_MS);
  return Math.abs(days) < 30
    ? relativeFormatter.format(days, 'day')
    : absoluteDateFormatter.format(timestamp);
}

export { ideaWorkspaceHref as proposalHref } from '@/features/ideas/idea-href';

export function summarizeDashboard(
  trips: TripListItem[],
  proposals: WorkspaceTripProposal[],
  viewerUserId?: string
): DashboardBuckets {
  const activeTrips = trips.filter((trip) => trip.archivedAt === null);
  const waitingOnYou = proposals.filter((proposal) => proposal.reviewRequested);
  const yourDrafts = proposals.filter(
    (proposal) =>
      shapingStatuses.has(proposal.status) &&
      (!viewerUserId || proposal.author.userId === viewerUserId)
  );
  const recentlySettled = proposals.filter((proposal) => settledStatuses.has(proposal.status));
  const openIdeas = proposals.filter((proposal) => openIdeaStatuses.has(proposal.status));
  const tripsNeedingAttention = activeTrips.filter((trip) => trip.outstandingActionCount > 0);

  return {
    activeTrips,
    metrics: {
      activeTrips: activeTrips.length,
      openIdeas: openIdeas.length,
      settled: proposals.filter((proposal) => proposal.status === 'merged').length,
      waitingOnYou: waitingOnYou.length
    },
    recentlySettled,
    tripsNeedingAttention,
    waitingOnYou,
    yourDrafts
  };
}

export function dashboardPresentation({
  errorMessage,
  isLoading,
  proposals,
  trips,
  viewerUserId
}: {
  errorMessage?: string | null;
  isLoading: boolean;
  proposals: WorkspaceTripProposal[];
  trips: TripListItem[];
  viewerUserId?: string;
}): DashboardPresentation {
  if (errorMessage) return { kind: 'error', message: errorMessage };
  if (isLoading) return { kind: 'loading' };

  const buckets = summarizeDashboard(trips, proposals, viewerUserId);
  if (buckets.activeTrips.length === 0 && proposals.length === 0) return { kind: 'empty' };
  return { buckets, kind: 'ready' };
}
