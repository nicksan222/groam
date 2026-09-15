import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vitest';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import {
  authorInitials,
  groupProposalsByTrip,
  latestTripActivityAt,
  orderTripsByRecentActivity,
  relativeTripDate,
  splitTripProposals,
  tripActivitySummaryParts,
  tripProposalHref
} from '@/features/trips/trip-list/trip-list-order';

function trip(id: string, lastUpdatedAt: number, archivedAt: number | null = null): TripListItem {
  return {
    archivedAt,
    coverUrl: null,
    dateNotes: null,
    destination: null,
    favorite: false,
    id: id as Id<'trips'>,
    lastUpdatedAt,
    name: id,
    nextAction: 'Continue planning together',
    outstandingActionCount: 0
  };
}

function proposal(
  sourceTripId: string,
  updatedAt: number,
  status: WorkspaceTripProposal['status'] = 'draft',
  reviewRequested = false
): WorkspaceTripProposal {
  return {
    author: { name: 'Taylor', userId: 'user-1' },
    ideaName: 'brave-otter',
    id: `proposal-${sourceTripId}-${updatedAt}` as Id<'tripProposals'>,
    reviewRequested,
    sourceTripId: sourceTripId as Id<'trips'>,
    sourceTripName: sourceTripId,
    status,
    title: 'Proposed change',
    updatedAt,
    workingTripId: `working-${sourceTripId}` as Id<'trips'>
  };
}

describe('trip portfolio ordering', () => {
  test('groups proposals without mixing trips', () => {
    const proposals = [proposal('trip-a', 20), proposal('trip-b', 30), proposal('trip-a', 40)];
    const grouped = groupProposalsByTrip(proposals);

    expect(grouped.get('trip-a' as Id<'trips'>)).toEqual([proposals[0], proposals[2]]);
    expect(grouped.get('trip-b' as Id<'trips'>)).toEqual([proposals[1]]);
  });

  test('orders active trips before archived ones, then by recent activity', () => {
    const trips = [trip('archived-recent', 100, 1), trip('active-old', 10), trip('active-new', 50)];
    const grouped = groupProposalsByTrip([]);

    expect(orderTripsByRecentActivity(trips, grouped).map(({ id }) => id)).toEqual([
      'active-new',
      'active-old',
      'archived-recent'
    ]);
  });

  test('orders by the newest trip or proposal activity without mutating input', () => {
    const trips = [trip('recent-trip', 80), trip('recent-proposal', 20), trip('old', 10)];
    const original = [...trips];
    const grouped = groupProposalsByTrip([proposal('recent-proposal', 100)]);

    expect(orderTripsByRecentActivity(trips, grouped).map(({ id }) => id)).toEqual([
      'recent-proposal',
      'recent-trip',
      'old'
    ]);
    expect(trips).toEqual(original);
    expect(latestTripActivityAt(trips[1]!, grouped.get(trips[1]!.id) ?? [])).toBe(100);
  });

  test('splits open and settled proposals and builds summary parts', () => {
    const proposals = [
      proposal('trip-a', 20, 'draft'),
      proposal('trip-a', 30, 'merged'),
      proposal('trip-a', 40, 'in_review', true)
    ];
    const currentTrip = trip('trip-a', 10);
    currentTrip.outstandingActionCount = 2;
    currentTrip.nextAction = 'Pick dates';
    const split = splitTripProposals(proposals);

    expect(split.openIdeas).toHaveLength(2);
    expect(split.settled).toHaveLength(1);
    expect(split.waitingOnYou).toHaveLength(1);
    expect(tripActivitySummaryParts({ ...split, trip: currentTrip })).toEqual([
      '2 open ideas',
      '1 waiting on you',
      '1 settled',
      'Pick dates'
    ]);
  });

  test('formats author initials, relative dates, and draft proposal links', () => {
    const now = Date.UTC(2026, 7, 17);
    expect(authorInitials('Alex Morgan')).toBe('AM');
    expect(authorInitials('Taylor')).toBe('TA');
    expect(relativeTripDate(now - 2 * 86_400_000, now)).toMatch(/2 days ago|day/);
    expect(
      tripProposalHref({
        id: 'proposal-1' as Id<'tripProposals'>,
        sourceTripId: 'trip-a' as Id<'trips'>,
        status: 'draft',
        workingTripId: 'working-a' as Id<'trips'>
      })
    ).toEqual({
      params: { proposalId: 'proposal-1', tripId: 'trip-a', view: 'overview' },
      search: {},
      to: '/trips/$tripId/ideas/$proposalId/$view'
    });
  });
});
