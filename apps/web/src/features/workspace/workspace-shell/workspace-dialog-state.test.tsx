import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test } from 'vitest';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';

beforeEach(() => {
  useWorkspaceDialogs.setState({ dialog: null, inviteContext: null });
});

test('useWorkspaceDialogs opens and closes workspace dialogs', () => {
  const { result } = renderHook(() => useWorkspaceDialogs());

  expect(result.current.dialog).toBeNull();

  act(() => {
    result.current.openDialog('invite');
  });
  expect(result.current.dialog).toBe('invite');

  act(() => {
    result.current.closeDialog();
  });
  expect(result.current.dialog).toBeNull();
});

test('useWorkspaceDialogs replaces the active dialog when opened again', () => {
  const { result } = renderHook(() => useWorkspaceDialogs());

  act(() => {
    result.current.openDialog('invite');
  });
  act(() => {
    result.current.openDialog('create-organization');
  });

  expect(result.current.dialog).toBe('create-organization');
});
