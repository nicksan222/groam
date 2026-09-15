import { describe, expect, test } from 'vitest';
import {
  dashboardPresentation,
  greetingForHour,
  proposalHref,
  proposalStatusLabel,
  relativeDate,
  summarizeDashboard
} from '@/features/dashboard/hooks/dashboard-model';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import {
  TRIP_FIXTURE_NOW as now,
  workspaceTripProposal as proposal,
  tripListItem as trip
} from '@/features/trips/test-fixtures';

const DAY_MS = 86_400_000;

describe('greetingForHour', () => {
  test('names the time of day in plain language', () => {
    expect(greetingForHour(3)).toBe('Working late');
    expect(greetingForHour(8)).toBe('Good morning');
    expect(greetingForHour(14)).toBe('Good afternoon');
    expect(greetingForHour(19)).toBe('Good evening');
  });
});

describe('relativeDate', () => {
  test('uses a relative day when the timestamp is within a month', () => {
    expect(relativeDate(now - DAY_MS, now)).toBe(
      new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-1, 'day')
    );
  });

  test('uses a calendar date when the timestamp is older than a month', () => {
    expect(relativeDate(Date.UTC(2026, 5, 1), now)).toBe(
      new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(Date.UTC(2026, 5, 1))
    );
  });
});

describe('proposalHref', () => {
  test('opens a draft on the nested idea clone', () => {
    expect(proposalHref(proposal({ status: 'draft' }))).toEqual({
      params: { proposalId: 'tripProposals:idea-1', tripId: 'trips:trip-1', view: 'overview' },
      search: {},
      to: '/trips/$tripId/ideas/$proposalId/$view'
    });
  });

  test('opens a shared idea on the compare tab', () => {
    expect(proposalHref(proposal({ status: 'in_review' }))).toEqual({
      params: { proposalId: 'tripProposals:idea-1', tripId: 'trips:trip-1', view: 'compare' },
      search: {},
      to: '/trips/$tripId/ideas/$proposalId/$view'
    });
  });
});

describe('summarizeDashboard', () => {
  test('buckets trips and ideas the home view needs', () => {
    const buckets = summarizeDashboard(
      [
        trip(),
        trip({
          archivedAt: now,
          id: 'trips:archived' as TripListItem['id'],
          name: 'Last year'
        }),
        trip({
          id: 'trips:open' as TripListItem['id'],
          name: 'Open dates',
          nextAction: 'Agree on the travel period',
          outstandingActionCount: 1
        })
      ],
      [
        proposal({ reviewRequested: true, title: 'Please review the coast day' }),
        proposal({
          id: 'tripProposals:draft' as WorkspaceTripProposal['id'],
          status: 'draft',
          title: 'Packing list'
        }),
        proposal({
          id: 'tripProposals:merged' as WorkspaceTripProposal['id'],
          status: 'merged',
          title: 'Train tickets'
        }),
        proposal({
          id: 'tripProposals:closed' as WorkspaceTripProposal['id'],
          status: 'closed',
          title: 'Skip the ferry'
        }),
        proposal({
          author: { name: 'Sam Planner', userId: 'user-sam' },
          id: 'tripProposals:other-draft' as WorkspaceTripProposal['id'],
          status: 'draft',
          title: 'Someone else’s packing'
        })
      ],
      'user-alex'
    );

    expect(buckets.activeTrips.map((item) => item.name)).toEqual(['Atlantic week', 'Open dates']);
    expect(buckets.waitingOnYou.map((item) => item.title)).toEqual(['Please review the coast day']);
    expect(buckets.yourDrafts.map((item) => item.title)).toEqual(['Packing list']);
    expect(buckets.recentlySettled.map((item) => item.title)).toEqual([
      'Train tickets',
      'Skip the ferry'
    ]);
    expect(buckets.tripsNeedingAttention.map((item) => item.name)).toEqual(['Open dates']);
    expect(buckets.metrics).toEqual({
      activeTrips: 2,
      openIdeas: 3,
      settled: 1,
      waitingOnYou: 1
    });
  });
});

describe('dashboardPresentation', () => {
  test('surfaces an error before loading or empty states', () => {
    expect(
      dashboardPresentation({
        errorMessage: 'Unable to load workspace home',
        isLoading: true,
        proposals: [],
        trips: []
      })
    ).toEqual({ kind: 'error', message: 'Unable to load workspace home' });
  });

  test('waits while either query is still loading', () => {
    expect(
      dashboardPresentation({ isLoading: true, proposals: [proposal()], trips: [trip()] })
    ).toEqual({ kind: 'loading' });
  });

  test('is empty when there are no active trips and no ideas', () => {
    expect(
      dashboardPresentation({
        isLoading: false,
        proposals: [],
        trips: [trip({ archivedAt: now, name: 'Last year' })]
      })
    ).toEqual({ kind: 'empty' });
  });

  test('is ready when the group has trips or ideas to act on', () => {
    const presentation = dashboardPresentation({
      isLoading: false,
      proposals: [],
      trips: [trip()]
    });
    expect(presentation.kind).toBe('ready');
    if (presentation.kind !== 'ready') return;
    expect(presentation.buckets.activeTrips).toHaveLength(1);
  });
});

describe('proposalStatusLabel', () => {
  test('keeps settled and in-progress labels distinct', () => {
    expect(proposalStatusLabel.merged).toBe('Applied');
    expect(proposalStatusLabel.closed).toBe('Closed');
    expect(proposalStatusLabel.draft).toBe('Draft');
  });
});
