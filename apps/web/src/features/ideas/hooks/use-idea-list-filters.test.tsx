import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useIdeaListFilters } from './use-idea-list-filters';
import type { WorkspaceIdea } from './use-workspace-ideas';

function idea(
  value: Partial<WorkspaceIdea> & Pick<WorkspaceIdea, 'id' | 'status' | 'title'>
): WorkspaceIdea {
  return {
    author: { name: 'Ada', userId: 'user-1' },
    ideaName: value.title,
    reviewRequested: false,
    sourceTripId: 'trip-1' as Id<'trips'>,
    sourceTripName: 'Portugal',
    updatedAt: 1,
    workingTripId: 'trip-w' as Id<'trips'>,
    ...value
  };
}

describe('useIdeaListFilters', () => {
  test('defaults to pending and filters drafts in', () => {
    const proposals = [
      idea({ id: 'p1' as Id<'tripProposals'>, status: 'draft', title: 'Coast' }),
      idea({ id: 'p2' as Id<'tripProposals'>, status: 'merged', title: 'Done' })
    ];
    const { result } = renderHook(() =>
      useIdeaListFilters({
        emptyFilterMessage: (filter) => `empty:${filter}`,
        proposals,
        viewerUserId: 'user-1'
      })
    );

    expect(result.current.statusFilter).toBe('pending');
    expect(result.current.visibleProposals.map((item) => item.id)).toEqual(['p1']);
    expect(result.current.empty).toBe('empty:pending');
  });

  test('clearing status resets to the default filter', () => {
    const { result } = renderHook(() =>
      useIdeaListFilters({
        emptyFilterMessage: () => 'none',
        proposals: []
      })
    );

    act(() => {
      result.current.setStatusFilter('all');
    });
    expect(result.current.hasExtraFilters).toBe(true);

    act(() => {
      result.current.clearStatusFilter();
    });
    expect(result.current.statusFilter).toBe('pending');
    expect(result.current.hasExtraFilters).toBe(false);
  });

  test('filters by search query in the visible list', () => {
    const proposals = [
      idea({ id: 'p1' as Id<'tripProposals'>, status: 'draft', title: 'Coast day' }),
      idea({ id: 'p2' as Id<'tripProposals'>, status: 'draft', title: 'Museum morning' })
    ];
    const { result } = renderHook(() =>
      useIdeaListFilters({
        emptyFilterMessage: () => 'none',
        proposals
      })
    );

    act(() => {
      result.current.setQuery('museum');
    });
    expect(result.current.visibleProposals.map((item) => item.id)).toEqual(['p2']);
  });
});
