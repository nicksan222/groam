import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { IssueListItem } from './issue-list-item';
import { useIssueListFilters } from './use-issue-list-filters';

function issue(
  value: Partial<IssueListItem> & Pick<IssueListItem, 'id' | 'status' | 'title'>
): IssueListItem {
  return {
    assignee: null,
    author: { name: 'Ada', userId: 'user-1' },
    idea: null,
    tripName: 'Portugal',
    updatedAt: 1,
    ...value
  };
}

describe('useIssueListFilters', () => {
  test('defaults to open issues', () => {
    const issues = [
      issue({ id: 'i1' as Id<'tripIssues'>, status: 'open', title: 'Coast' }),
      issue({ id: 'i2' as Id<'tripIssues'>, status: 'closed', title: 'Done' })
    ];
    const { result } = renderHook(() =>
      useIssueListFilters({
        emptyFilterMessage: (filter) => `empty:${filter}`,
        issues
      })
    );

    expect(result.current.statusFilter).toBe('open');
    expect(result.current.visibleIssues.map((item) => item.id)).toEqual(['i1']);
    expect(result.current.empty).toBe('empty:open');
  });

  test('honors an external default status', () => {
    const issues = [
      issue({ id: 'i1' as Id<'tripIssues'>, status: 'open', title: 'Coast' }),
      issue({ id: 'i2' as Id<'tripIssues'>, status: 'closed', title: 'Done' })
    ];
    const { result } = renderHook(() =>
      useIssueListFilters({
        defaultStatus: 'closed',
        emptyFilterMessage: () => 'none',
        issues
      })
    );
    expect(result.current.statusFilter).toBe('closed');
    expect(result.current.visibleIssues.map((item) => item.id)).toEqual(['i2']);
    expect(result.current.hasExtraFilters).toBe(false);
  });

  test('clearing status resets to the default filter', () => {
    const { result } = renderHook(() =>
      useIssueListFilters({
        emptyFilterMessage: () => 'none',
        issues: []
      })
    );

    act(() => {
      result.current.setStatusFilter('closed');
    });
    expect(result.current.hasExtraFilters).toBe(true);

    act(() => {
      result.current.clearStatusFilter();
    });
    expect(result.current.statusFilter).toBe('open');
    expect(result.current.hasExtraFilters).toBe(false);
  });
});
