import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useQueryStatusFilter } from './use-query-status-filter';

describe('useQueryStatusFilter', () => {
  test('tracks query, status, and empty copy', () => {
    const { result } = renderHook(() =>
      useQueryStatusFilter({
        defaultStatus: 'open' as 'closed' | 'open',
        emptyFilterMessage: (status) => `empty:${status}`,
        noMatchMessage: 'No matching issues.'
      })
    );

    expect(result.current.statusFilter).toBe('open');
    expect(result.current.hasExtraFilters).toBe(false);
    expect(result.current.empty).toBe('empty:open');

    act(() => {
      result.current.setStatusFilter('closed');
      result.current.setQuery('lisbon');
    });
    expect(result.current.hasExtraFilters).toBe(true);
    expect(result.current.empty).toBe('No matching issues.');

    act(() => {
      result.current.clearStatusFilter();
      result.current.setQuery('');
    });
    expect(result.current.statusFilter).toBe('open');
    expect(result.current.hasExtraFilters).toBe(false);
  });
});
