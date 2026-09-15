import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import type { ProposalsByTrip } from '@/types/trips';

const DAY_MS = 86_400_000;
const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const absoluteDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

const openIdeaStatuses = new Set<WorkspaceTripProposal['status']>([
  'conflicted',
  'draft',
  'in_review'
]);

export function relativeTripDate(timestamp: number, now = Date.now()) {
  const elapsedDays = Math.round((timestamp - now) / DAY_MS);
  if (Math.abs(elapsedDays) < 30) return relativeFormatter.format(elapsedDays, 'day');
  return absoluteDateFormatter.format(timestamp);
}

export { ideaWorkspaceHref as tripProposalHref } from '@/features/ideas/idea-href';
export { displayInitials as authorInitials } from '@/lib/display-initials';
export type { ProposalsByTrip };

export function splitTripProposals(proposals: WorkspaceTripProposal[]) {
  const openIdeas = proposals.filter((proposal) => openIdeaStatuses.has(proposal.status));
  const settled = proposals.filter((proposal) => !openIdeaStatuses.has(proposal.status));
  const waitingOnYou = openIdeas.filter((proposal) => proposal.reviewRequested);
  return { openIdeas, settled, waitingOnYou };
}

export function tripActivitySummaryParts({
  openIdeas,
  settled,
  trip,
  waitingOnYou
}: {
  openIdeas: WorkspaceTripProposal[];
  settled: WorkspaceTripProposal[];
  trip: TripListItem;
  waitingOnYou: WorkspaceTripProposal[];
}) {
  return [
    openIdeas.length > 0
      ? `${openIdeas.length} open idea${openIdeas.length === 1 ? '' : 's'}`
      : null,
    waitingOnYou.length > 0 ? `${waitingOnYou.length} waiting on you` : null,
    settled.length > 0 ? `${settled.length} settled` : null,
    trip.outstandingActionCount > 0 ? trip.nextAction : null
  ].filter((part): part is string => part !== null);
}

export function groupProposalsByTrip(proposals: WorkspaceTripProposal[]): ProposalsByTrip {
  const grouped: ProposalsByTrip = new Map();
  for (const proposal of proposals) {
    const current = grouped.get(proposal.sourceTripId) ?? [];
    current.push(proposal);
    grouped.set(proposal.sourceTripId, current);
  }
  return grouped;
}

export function latestTripActivityAt(
  trip: TripListItem,
  proposals: WorkspaceTripProposal[]
): number {
  return proposals.reduce(
    (latest, proposal) => Math.max(latest, proposal.updatedAt),
    trip.lastUpdatedAt
  );
}

export function orderTripsByRecentActivity(
  trips: TripListItem[],
  proposalsByTrip: ProposalsByTrip
): TripListItem[] {
  return trips.toSorted((left, right) => {
    const leftArchived = left.archivedAt !== null;
    const rightArchived = right.archivedAt !== null;
    if (leftArchived !== rightArchived) return leftArchived ? 1 : -1;

    return (
      latestTripActivityAt(right, proposalsByTrip.get(right.id) ?? []) -
      latestTripActivityAt(left, proposalsByTrip.get(left.id) ?? [])
    );
  });
}
