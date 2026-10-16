import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import type { IssueListItem } from '@/types/issues';
import { useIssueListFilters } from './use-issue-list-filters';

const listItem = {
  assignee: null,
  author: { name: 'Alex Morgan', userId: 'user-alex' },
  canAssign: true,
  canManage: true,
  condition: null,
  dueAt: null,
  id: 'issue-1' as Id<'tripIssues'>,
  idea: null,
  labels: [],
  rank: 0,
  status: 'open',
  title: 'Coast day',
  updatedAt: Date.UTC(2026, 7, 17)
} satisfies Omit<IssueListItem, 'tripName'>;

const issueListItem = (over: Partial<IssueListItem> = {}): IssueListItem => ({
  ...listItem,
  tripName: 'Atlantic week',
  ...over
});

describe('useIssueListFilters', () => {
  test('defaults to open issues', async () => {
    const issues = [
      issueListItem({ id: 'i1' as Id<'tripIssues'>, status: 'open', title: 'Coast' }),
      issueListItem({ id: 'i2' as Id<'tripIssues'>, status: 'closed', title: 'Done' })
    ];
    const { result } = await renderHook(() =>
      useIssueListFilters({
        emptyFilterMessage: (filter) => `empty:${filter}`,
        issues
      })
    );

    expect(result.current.statusFilter).toBe('open');
    expect(result.current.visibleIssues.map((item) => item.id)).toEqual(['i1']);
    expect(result.current.empty).toBe('empty:open');
  });

  test('honors an external default status', async () => {
    const issues = [
      issueListItem({ id: 'i1' as Id<'tripIssues'>, status: 'open', title: 'Coast' }),
      issueListItem({ id: 'i2' as Id<'tripIssues'>, status: 'closed', title: 'Done' })
    ];
    const { result } = await renderHook(() =>
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

  test('clearing status resets to the default filter', async () => {
    const { result } = await renderHook(() =>
      useIssueListFilters({
        emptyFilterMessage: () => 'none',
        issues: []
      })
    );

    await act(() => {
      result.current.setStatusFilter('closed');
    });
    expect(result.current.hasExtraFilters).toBe(true);

    await act(() => {
      result.current.clearStatusFilter();
    });
    expect(result.current.statusFilter).toBe('open');
    expect(result.current.hasExtraFilters).toBe(false);
  });

  test('handles an unloaded issue list and all-status selection', async () => {
    const { result } = await renderHook(() =>
      useIssueListFilters({
        defaultStatus: 'all',
        emptyFilterMessage: () => 'none',
        issues: undefined
      })
    );
    expect(result.current.visibleIssues).toEqual([]);
    expect(result.current.statusFilter).toBe('all');
  });
});
