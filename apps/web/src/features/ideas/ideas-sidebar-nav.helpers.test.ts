import type { Id } from '@groam/backend/data-model';
import { expect, test } from 'vitest';
import type { WorkspaceIdea } from '@/features/ideas/hooks/use-workspace-ideas';
import {
  filterOpenIdeas,
  isActiveOpenIdea,
  isIdeasIndexActive,
  proposalHref,
  showEmptyPortfolio
} from './ideas-sidebar-nav.helpers';

function proposal(
  value: Partial<WorkspaceIdea> & Pick<WorkspaceIdea, 'id' | 'status'>
): WorkspaceIdea {
  return {
    author: { name: 'Test Owner', userId: 'user' },
    ideaName: 'bright-fox',
    reviewRequested: false,
    sourceTripId: 'trip-source' as WorkspaceIdea['sourceTripId'],
    sourceTripName: 'Summer trip',
    title: 'Extend Lisbon stay',
    updatedAt: 1,
    workingTripId: 'trip-working' as WorkspaceIdea['workingTripId'],
    ...value
  };
}

test('proposalHref routes drafts to the nested idea clone', () => {
  expect(
    proposalHref(
      proposal({
        id: 'idea-draft' as WorkspaceIdea['id'],
        status: 'draft'
      })
    )
  ).toEqual({
    params: { proposalId: 'idea-draft', tripId: 'trip-source', view: 'overview' },
    search: {},
    to: '/trips/$tripId/ideas/$proposalId/$view'
  });
});

test('proposalHref routes submitted ideas to the compare tab', () => {
  expect(
    proposalHref(
      proposal({
        id: 'idea-review' as WorkspaceIdea['id'],
        status: 'in_review'
      })
    )
  ).toEqual({
    params: { proposalId: 'idea-review', tripId: 'trip-source', view: 'compare' },
    search: {},
    to: '/trips/$tripId/ideas/$proposalId/$view'
  });
});

test('isActiveOpenIdea matches idea routes and working-trip drafts', () => {
  const inReview = proposal({
    id: 'idea-review' as WorkspaceIdea['id'],
    status: 'in_review'
  });

  expect(isActiveOpenIdea(inReview, 'idea-review', 'trip-source')).toBe(true);
  expect(isActiveOpenIdea(inReview, null, 'trip-working')).toBe(true);
  expect(isActiveOpenIdea(inReview, null, 'trip-source')).toBe(false);
});

test('isIdeasIndexActive only matches the workspace ideas list', () => {
  expect(isIdeasIndexActive('/ideas')).toBe(true);
  expect(isIdeasIndexActive('/ideas/')).toBe(true);
  expect(isIdeasIndexActive('/ideas/idea-review')).toBe(false);
  expect(isIdeasIndexActive('/trips/trip-source/versions')).toBe(false);
});

test('filterOpenIdeas keeps only draft, in-review, and conflicted ideas', () => {
  const proposals = [
    proposal({ id: 'open' as Id<'tripProposals'>, status: 'draft' }),
    proposal({ id: 'closed' as Id<'tripProposals'>, status: 'closed' }),
    proposal({ id: 'review' as Id<'tripProposals'>, status: 'in_review' }),
    proposal({ id: 'conflicted' as Id<'tripProposals'>, status: 'conflicted' })
  ];

  expect(filterOpenIdeas(proposals).map((item) => item.id)).toEqual([
    'open',
    'review',
    'conflicted'
  ]);
});

test('showEmptyPortfolio keeps load-more available while pages remain', () => {
  expect(showEmptyPortfolio(0, true)).toBe(false);
  expect(showEmptyPortfolio(0, false)).toBe(true);
});
