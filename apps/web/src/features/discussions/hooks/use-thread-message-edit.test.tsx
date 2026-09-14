import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useThreadMessageEdit, useThreadMessageEditing } from './use-thread-message-edit';

describe('useThreadMessageEditing', () => {
  test('toggles the editing boolean', () => {
    const { result } = renderHook(() => useThreadMessageEditing());
    expect(result.current.editing).toBe(false);
    act(() => {
      result.current.startEditing();
    });
    expect(result.current.editing).toBe(true);
    act(() => {
      result.current.stopEditing();
    });
    expect(result.current.editing).toBe(false);
  });
});

describe('useThreadMessageEdit', () => {
  test('blocks empty saves and submits trimmed text', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useThreadMessageEdit({ initialText: 'hello', onCancel, onSave })
    );

    act(() => {
      result.current.setDraft('   ');
    });
    expect(result.current.canSave).toBe(false);
    act(() => {
      result.current.submit();
    });
    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      result.current.setDraft('  updated  ');
      result.current.submit();
    });
    expect(onSave).toHaveBeenCalledWith('updated');
  });

  test('Escape cancels and Cmd+Enter saves', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useThreadMessageEdit({ initialText: 'hello', onCancel, onSave })
    );

    act(() => {
      result.current.onKeyDown({
        key: 'Escape',
        preventDefault: vi.fn()
      } as never);
    });
    expect(onCancel).toHaveBeenCalled();

    act(() => {
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
