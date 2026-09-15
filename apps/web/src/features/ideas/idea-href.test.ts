import type { Id } from '@groam/backend/data-model';
import { expect, test } from 'vitest';
import { ideaCloneHref, ideaDetailHref, ideaListHref, ideaWorkspaceHref } from './idea-href';

const proposalId = 'idea-review' as Id<'tripProposals'>;
const sourceTripId = 'trip-source' as Id<'trips'>;
const workingTripId = 'trip-working' as Id<'trips'>;

const nestedCloneHref = {
  params: { proposalId, tripId: sourceTripId, view: 'overview' as const },
  search: {},
  to: '/trips/$tripId/ideas/$proposalId/$view'
};

const nestedCompareHref = {
  params: { proposalId, tripId: sourceTripId, view: 'compare' as const },
  search: {},
  to: '/trips/$tripId/ideas/$proposalId/$view'
};

test('ideaWorkspaceHref opens drafts on the nested idea clone', () => {
  expect(
    ideaWorkspaceHref({
      id: proposalId,
      sourceTripId,
      status: 'draft',
      workingTripId
    })
  ).toEqual(nestedCloneHref);
});

test('ideaWorkspaceHref opens submitted ideas on the compare tab', () => {
  expect(
    ideaWorkspaceHref({
      id: proposalId,
      sourceTripId,
      status: 'in_review',
      workingTripId
    })
  ).toEqual(nestedCompareHref);
});

test('ideaWorkspaceHref falls back to the idea page without a source trip', () => {
  expect(
    ideaWorkspaceHref({
      id: proposalId,
      status: 'in_review',
      workingTripId
    })
  ).toEqual({
    params: { proposalId },
    to: '/ideas/$proposalId'
  });
});

test('ideaDetailHref always targets the idea page', () => {
  expect(ideaDetailHref(proposalId)).toEqual({
    params: { proposalId },
    to: '/ideas/$proposalId'
  });
});

test('ideaListHref uses the ideas section', () => {
  expect(ideaListHref(sourceTripId)).toEqual({
    params: { section: 'ideas', tripId: sourceTripId },
    search: {},
    to: '/trips/$tripId/$section'
  });
});

test('ideaCloneHref keeps add-destination on itinerary', () => {
  expect(
    ideaCloneHref({ id: proposalId, sourceTripId }, 'overview', { addDestination: true })
  ).toEqual({
    params: { proposalId, tripId: sourceTripId, view: 'itinerary' },
    search: { addDestination: true },
    to: '/trips/$tripId/ideas/$proposalId/$view'
  });
});
