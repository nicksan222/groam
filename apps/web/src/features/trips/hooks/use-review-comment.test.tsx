import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { useReviewComment } from './use-review-comment';

describe('useReviewComment', () => {
  test('expands resolved threads and clears reply after success', async () => {
    const onReply = vi.fn().mockResolvedValue(true);
    const onResolve = vi.fn().mockResolvedValue(true);
    const { result } = await renderHook(() =>
      useReviewComment({ onReply, onResolve, resolvedAt: 1 })
    );

    expect(result.current.isExpanded).toBe(false);
    await act(() => {
      result.current.showResolved();
    });
    expect(result.current.isExpanded).toBe(true);

    await act(() => {
      result.current.toggleReplying();
      result.current.setReply('  looks good  ');
    });
    expect(result.current.canSubmitReply).toBe(true);

    await act(async () => {
      await result.current.submitReply();
    });
    expect(onReply).toHaveBeenCalledWith('looks good');
    expect(result.current.reply).toBe('');
    expect(result.current.isReplying).toBe(false);
  });

  test('collapses reply UI after resolve', async () => {
    const { result } = await renderHook(() =>
      useReviewComment({
        onReply: vi.fn(),
        onResolve: vi.fn().mockResolvedValue(true),
        resolvedAt: null
      })
    );

    await act(() => {
      result.current.toggleReplying();
    });
    await act(async () => {
      await result.current.toggleResolved();
    });
    expect(result.current.isReplying).toBe(false);
  });

  test('does not submit blank or failed replies and keeps the draft', async () => {
    const onReply = vi.fn().mockResolvedValue(false);
    const { result } = await renderHook(() =>
      useReviewComment({ onReply, onResolve: vi.fn().mockResolvedValue(false), resolvedAt: null })
    );

    await act(async () => expect(await result.current.submitReply()).toBe(false));
    expect(onReply).not.toHaveBeenCalled();
    await act(() => result.current.setReply('Needs context'));
    await act(async () => expect(await result.current.submitReply()).toBe(false));
    expect(result.current.reply).toBe('Needs context');
    await act(async () => expect(await result.current.toggleResolved()).toBe(false));
  });
});
