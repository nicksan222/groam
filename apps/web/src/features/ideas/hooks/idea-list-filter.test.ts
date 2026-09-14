import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vitest';
import { DEFAULT_IDEA_STATUS_FILTER, filterWorkspaceIdeas } from './idea-list-filter';
import type { WorkspaceIdea } from './use-workspace-ideas';

function idea(
  value: Partial<WorkspaceIdea> & Pick<WorkspaceIdea, 'id' | 'status' | 'title'>
): WorkspaceIdea {
  return {
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    ideaName: 'coast-day',
    reviewRequested: false,
    sourceTripId: 'trip-1' as WorkspaceIdea['sourceTripId'],
    sourceTripName: 'Atlantic week',
    updatedAt: 1,
    workingTripId: 'working-1' as WorkspaceIdea['workingTripId'],
    ...value
  };
}

const proposals = [
  idea({
    id: 'idea-draft' as Id<'tripProposals'>,
    ideaName: 'extra-night',
    status: 'draft',
    title: 'Extend the stay'
  }),
  idea({
    id: 'idea-open' as Id<'tripProposals'>,
    status: 'in_review',
    title: 'Add a coast day'
  }),
  idea({
    author: { name: 'Sam Planner', userId: 'user-sam' },
    id: 'idea-settled' as Id<'tripProposals'>,
    ideaName: 'museum-stop',
    sourceTripName: 'City break',
    status: 'merged',
    title: 'Add a museum morning'
  }),
  idea({
    id: 'idea-closed' as Id<'tripProposals'>,
    ideaName: 'skip-ferry',
    status: 'closed',
    title: 'Skip the ferry'
  })
];

const defaultFilters = { query: '', status: DEFAULT_IDEA_STATUS_FILTER } as const;

describe('filterWorkspaceIdeas', () => {
  test('defaults to open ideas including the viewer’s draft', () => {
    expect(
      filterWorkspaceIdeas(proposals, defaultFilters, 'user-alex').map(({ id }) => id)
    ).toEqual(['idea-draft', 'idea-open']);
  });

  test('hides other people’s drafts from the Open filter', () => {
    expect(filterWorkspaceIdeas(proposals, defaultFilters, 'user-sam').map(({ id }) => id)).toEqual(
      ['idea-open']
    );
  });

  test('filters settled ideas', () => {
    expect(
      filterWorkspaceIdeas(proposals, { query: '', status: 'merged' }).map(({ id }) => id)
    ).toEqual(['idea-settled', 'idea-closed']);
  });

  test('searches title, author, trip, and idea name case-insensitively', () => {
    expect(
      filterWorkspaceIdeas(proposals, { query: 'MUSEUM', status: 'all' }).map(({ id }) => id)
    ).toEqual(['idea-settled']);
    expect(
      filterWorkspaceIdeas(proposals, { query: 'sam planner', status: 'all' }).map(({ id }) => id)
    ).toEqual(['idea-settled']);
    expect(
      filterWorkspaceIdeas(proposals, { query: 'atlantic', status: 'all' }).map(({ id }) => id)
    ).toEqual(['idea-draft', 'idea-open', 'idea-closed']);
    expect(
      filterWorkspaceIdeas(proposals, { query: 'coast-day', status: 'all' }).map(({ id }) => id)
    ).toEqual(['idea-open']);
  });

  test('combines search with the status filter', () => {
    expect(filterWorkspaceIdeas(proposals, { query: 'museum', status: 'pending' })).toEqual([]);
    expect(
      filterWorkspaceIdeas(proposals, { query: 'museum', status: 'merged' }).map(({ id }) => id)
    ).toEqual(['idea-settled']);
  });
});
