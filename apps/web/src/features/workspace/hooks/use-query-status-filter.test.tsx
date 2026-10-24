import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { useQueryStatusFilter } from './use-query-status-filter';

describe('useQueryStatusFilter', () => {
  test('tracks query, status, and empty copy', async () => {
    const { result } = await renderHook(() =>
      useQueryStatusFilter({
        defaultStatus: 'open' as 'closed' | 'open',
        emptyFilterMessage: (status) => `empty:${status}`,
        noMatchMessage: 'No matching issues.'
      })
    );

    expect(result.current.statusFilter).toBe('open');
    expect(result.current.hasExtraFilters).toBe(false);
    expect(result.current.empty).toBe('empty:open');

    await act(() => {
      result.current.setStatusFilter('closed');
      result.current.setQuery('lisbon');
    });
    expect(result.current.hasExtraFilters).toBe(true);
    expect(result.current.empty).toBe('No matching issues.');

    await act(() => {
      result.current.clearStatusFilter();
      result.current.setQuery('');
    });
    expect(result.current.statusFilter).toBe('open');
    expect(result.current.hasExtraFilters).toBe(false);
  });
});
