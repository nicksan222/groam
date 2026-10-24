import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { useReviewComment } from './use-review-comment';

describe('useReviewComment', () => {
  test('expands resolved threads and toggles the reply box', async () => {
    const { result } = await renderHook(() =>
      useReviewComment({ onResolve: vi.fn().mockResolvedValue(true), resolvedAt: 1 })
    );

    expect(result.current.isExpanded).toBe(false);
    await act(() => result.current.showResolved());
    expect(result.current.isExpanded).toBe(true);
    await act(() => result.current.toggleReplying());
    expect(result.current.isReplying).toBe(true);
    await act(() => result.current.cancelReply());
    expect(result.current.isReplying).toBe(false);
  });

  test('collapses the reply box after resolving', async () => {
    const { result } = await renderHook(() =>
      useReviewComment({ onResolve: vi.fn().mockResolvedValue(true), resolvedAt: null })
    );

    await act(() => result.current.toggleReplying());
    await act(async () => expect(await result.current.toggleResolved()).toBe(true));
    expect(result.current.isReplying).toBe(false);
  });

  test('keeps the reply box when resolving fails', async () => {
    const { result } = await renderHook(() =>
      useReviewComment({ onResolve: vi.fn().mockResolvedValue(false), resolvedAt: null })
    );

    await act(() => result.current.toggleReplying());
    await act(async () => expect(await result.current.toggleResolved()).toBe(false));
    expect(result.current.isReplying).toBe(true);
  });
});
