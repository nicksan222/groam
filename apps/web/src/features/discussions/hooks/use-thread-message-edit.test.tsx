import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { useThreadMessageEdit, useThreadMessageEditing } from './use-thread-message-edit';

describe('useThreadMessageEditing', () => {
  test('toggles the editing boolean', async () => {
    const { result } = await renderHook(() => useThreadMessageEditing());
    expect(result.current.editing).toBe(false);
    await act(() => {
      result.current.startEditing();
    });
    expect(result.current.editing).toBe(true);
    await act(() => {
      result.current.stopEditing();
    });
    expect(result.current.editing).toBe(false);
  });
});

describe('useThreadMessageEdit', () => {
  test('blocks empty saves and submits trimmed text', async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { result } = await renderHook(() =>
      useThreadMessageEdit({ initialText: 'hello', onCancel, onSave })
    );

    await act(() => {
      result.current.setDraft('   ');
    });
    expect(result.current.canSave).toBe(false);
    await act(() => {
      result.current.submit();
    });
    expect(onSave).not.toHaveBeenCalled();

    await act(() => {
      result.current.setDraft('  updated  ');
      result.current.submit();
    });
    expect(onSave).toHaveBeenCalledWith('updated');
  });

  test('Escape cancels and Cmd+Enter saves', async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { result } = await renderHook(() =>
      useThreadMessageEdit({ initialText: 'hello', onCancel, onSave })
    );

    await act(() => {
      result.current.onKeyDown({
        key: 'Escape',
        preventDefault: vi.fn()
      } as never);
    });
    expect(onCancel).toHaveBeenCalled();

    await act(() => {
      result.current.setDraft('next');
      result.current.onKeyDown({
        key: 'Enter',
        metaKey: true,
        preventDefault: vi.fn()
      } as never);
    });
    expect(onSave).toHaveBeenCalledWith('next');
  });
});
