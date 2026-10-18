import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test } from 'vite-plus/test';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';

beforeEach(() => {
  useWorkspaceDialogs.setState({ dialog: null, inviteContext: null });
});

test('useWorkspaceDialogs opens and closes workspace dialogs', async () => {
  const { result } = await renderHook(() => useWorkspaceDialogs());

  expect(result.current.dialog).toBeNull();

  await act(() => {
    result.current.openDialog('invite');
  });
  expect(result.current.dialog).toBe('invite');

  await act(() => {
    result.current.closeDialog();
  });
  expect(result.current.dialog).toBeNull();
});

test('useWorkspaceDialogs replaces the active dialog when opened again', async () => {
  const { result } = await renderHook(() => useWorkspaceDialogs());

  await act(() => {
    result.current.openDialog('invite');
  });
  await act(() => {
    result.current.openDialog('create-organization');
  });

  expect(result.current.dialog).toBe('create-organization');
});
